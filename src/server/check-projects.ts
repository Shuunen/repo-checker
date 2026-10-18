import { partition } from 'es-toolkit'
import type { LocalClone, Project } from '../shared/project.ts'
import { plural } from '../shared/text.ts'
import { checkOne, type SplitRules } from './check-project.ts'
import type { CheckResult } from './engine/runner.ts'
import { addForkStatus } from './inventory/forks.ts'
import type { GhRunner } from './inventory/github.ts'
import { mapLimit } from './inventory/map-limit.ts'
import type { Progress } from './inventory/read-inventory.ts'
import type { ProjectMemory } from './project-memory.ts'

/** How many projects are checked at the same time */
const parallelProjects = 8

/** How many forks are compared with their parent at the same time, each one runs a few gh calls per branch */
const parallelForks = 8

/** The findings and rule outcomes of one project, project rules first. File rules are left out when the project has no usable clone of the owner */
export interface ProjectResult extends CheckResult {
  /** The project */
  project: Project
}

/** What checking the projects needs */
interface CheckProjectsOptions {
  /** Runs gh, to compare the forks with their parent */
  gh: GhRunner
  /** Remembers the results between scans: a project whose clone did not change and whose GitHub side is recent is not checked again. Undefined to remember nothing */
  memory?: ProjectMemory | undefined
  /** Called as soon as each project is checked */
  onProject: (result: ProjectResult) => void
  /** Receives a short line about what is done */
  onProgress: Progress
  /** Read a usable clone again with a fresh `git fetch`, so unpushed work is measured against the real remote. Undefined for `--no-fetch`. It runs right before the clone's own check, so no project waits for the fetch of another */
  refresh: ((local: LocalClone) => Promise<LocalClone>) | undefined
  /** The rules split by flavor */
  rules: SplitRules
  /** False to check every project even when the memory holds its result, still remembering the new results */
  shouldReuse?: boolean | undefined
}

/**
 * The result of a project whose checks threw: one error finding says so, so the rest of the scan goes on and the page shows what failed
 * @param project the project
 * @param error what was thrown
 * @returns the result
 */
function failedResult(project: Readonly<Project>, error: unknown): ProjectResult {
  const message = error instanceof Error ? error.message : String(error)
  return { findings: [{ actions: [], edits: [], installs: [], message: `the checks of this project failed: ${message}`, messageId: 'failed', ruleId: 'checks-failed', scope: 'project', severity: 'error' }], outcomes: [], project }
}

/** Gets a project ready to be checked, a fork gets its comparison with the parent */
type Prepare = (project: Readonly<Project>) => Promise<Project>

/**
 * Give a project its clone read again with a fresh fetch, when it has a usable one and fetching is on
 * @param project the project
 * @param refresh reads a clone again with a fetch, undefined when fetching is off
 * @returns the project, with its fresh clone
 */
async function withFreshClone(project: Readonly<Project>, refresh: CheckProjectsOptions['refresh']): Promise<Project> {
  const { local } = project
  if (refresh === undefined || local === undefined || local.problem !== undefined) return project
  return { ...project, local: await refresh(local) }
}

/**
 * Prepare and check one project, a failure of either becomes a result instead of an exception
 * @param project the project
 * @param prepare gets the project ready
 * @param setup what the checks need
 * @param setup.rules the rules split by flavor
 * @returns the result
 */
async function checkSafely(project: Readonly<Project>, prepare: Prepare, { rules }: Readonly<{ rules: SplitRules }>): Promise<ProjectResult> {
  try {
    const ready = await prepare(project)
    return { ...(await checkOne(ready, rules)), project: ready }
  } catch (error) {
    return failedResult(project, error)
  }
}

/**
 * Check the matched projects. A fork is first compared with its parent, the slowest part of a scan, so the other projects are checked meanwhile and reach `onProject` within about a second
 * @param projects the matched projects
 * @param options what checking needs
 * @param options.gh runs gh
 * @param options.memory remembers the results between scans
 * @param options.onProject called as soon as each project is checked
 * @param options.onProgress receives a short line about what is done
 * @param options.refresh reads a clone again with a fetch right before its check, undefined without fetch
 * @param options.rules the rules split by flavor
 * @param options.shouldReuse false to check every project even when the memory holds its result
 * @returns one result per project, sorted by name. A project whose checks throw (a malformed file, a gh failure on one fork) gets a `checks-failed` error finding, it never fails the scan
 * @example const results = await checkProjects(matchProjects(clones, repos, owner), { gh: ghCli, onProject: console.log, onProgress: console.log, rules })
 */
export async function checkProjects(projects: readonly Project[], { gh, memory, onProject, onProgress, refresh, rules, shouldReuse }: Readonly<CheckProjectsOptions>) {
  const [forks, others] = partition(projects, project => project.github?.isFork === true)
  onProgress(`checking ${plural(projects.length, 'project')}${refresh === undefined ? '' : ', each clone is fetched just before its check'}`)
  if (forks.length > 0) onProgress(`comparing ${plural(forks.length, 'fork')} with their parent`)
  const check = async (project: Readonly<Project>, prepare: Prepare) => {
    const recalled = (await memory?.recall(project, shouldReuse !== false)) ?? { fingerprint: '', hit: undefined }
    const result = recalled.hit ?? (await checkSafely(project, prepare, { rules }))
    if (recalled.hit === undefined && !result.findings.some(finding => finding.ruleId === 'checks-failed')) memory?.remember(result, recalled.fingerprint)
    onProject(result)
    return result
  }
  const checked = await Promise.all([mapLimit(others, parallelProjects, project => check(project, ready => withFreshClone(ready, refresh))), mapLimit(forks, parallelForks, fork => check(fork, async ready => withFreshClone(await addForkStatus(gh, ready), refresh)))])
  return checked.flat().toSorted((first, second) => first.project.name.localeCompare(second.project.name))
}
