import { partition } from 'es-toolkit'
import type { Project } from '../shared/project.ts'
import { plural } from '../shared/text.ts'
import { checkOne, type SplitRules } from './check-project.ts'
import type { CheckResult } from './engine/runner.ts'
import { addForkStatus } from './inventory/forks.ts'
import type { GhRunner } from './inventory/github.ts'
import { mapLimit } from './inventory/map-limit.ts'
import type { Progress } from './inventory/read-inventory.ts'

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
  /** Called as soon as each project is checked */
  onProject: (result: ProjectResult) => void
  /** Receives a short line about what is done */
  onProgress: Progress
  /** The rules split by flavor */
  rules: SplitRules
}

/**
 * Check the matched projects. A fork is first compared with its parent, the slowest part of a scan, so the other projects are checked meanwhile and reach `onProject` within about a second
 * @param projects the matched projects
 * @param options what checking needs
 * @param options.gh runs gh
 * @param options.onProject called as soon as each project is checked
 * @param options.onProgress receives a short line about what is done
 * @param options.rules the rules split by flavor
 * @returns one result per project, sorted by name
 * @example const results = await checkProjects(matchProjects(clones, repos, owner), { gh: ghCli, onProject: console.log, onProgress: console.log, rules })
 */
export async function checkProjects(projects: readonly Project[], { gh, onProject, onProgress, rules }: Readonly<CheckProjectsOptions>) {
  const [forks, others] = partition(projects, project => project.github?.isFork === true)
  onProgress(`checking ${plural(projects.length, 'project')}`)
  if (forks.length > 0) onProgress(`comparing ${plural(forks.length, 'fork')} with their parent`)
  const check = async (project: Readonly<Project>) => {
    const result = { ...(await checkOne(project, rules)), project }
    onProject(result)
    return result
  }
  const checked = await Promise.all([mapLimit(others, parallelProjects, check), mapLimit(forks, parallelForks, async fork => check(await addForkStatus(gh, fork)))])
  return checked.flat().toSorted((first, second) => first.project.name.localeCompare(second.project.name))
}
