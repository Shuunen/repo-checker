import type { LiveResult } from '../../shared/scan-event.ts'
import { checkOne, type SplitRules } from '../check-project.ts'
import type { ProjectResult } from '../check-projects.ts'
import { getRemainingCalls, type GhRunner } from '../inventory/github.ts'
import { fingerprintClone, type MemoryEntry, type ProjectMemory } from '../project-memory.ts'
import { toScanProject } from '../to-scan-project.ts'
import type { ActionOptions } from './action-options.ts'
import { rescanResult } from './rescan.ts'

/** Below this many calls left for the hour, GitHub is not read again on its own: a refresh of the project costs a few calls and the quota is shared with everything else the user runs */
const minimumCalls = 300

/** What watching a project needs */
interface LiveOptions extends ActionOptions {
  /** What the server remembers about the projects */
  memory: ProjectMemory
  /** The rules split by flavor */
  rules: SplitRules
  /** The fingerprint the page got last time, empty on its first question */
  since: string
}

/**
 * Tell if GitHub's rate limit leaves enough calls to read a project again. When GitHub cannot say, it does
 * @param gh runs gh
 * @returns true when the calls left are enough
 */
async function hasCalls(gh: GhRunner) {
  return ((await getRemainingCalls(gh)) ?? minimumCalls) >= minimumCalls
}

/**
 * Scan the project alone: GitHub, a fetch of the clone, the fork comparison, then every check
 * @param options what watching needs
 * @returns the project as it is now, with the fingerprint taken before its clone was read
 */
async function refreshAll(options: Readonly<LiveOptions>): Promise<LiveResult> {
  const outcome = await rescanResult(options)
  if (!outcome.ok) return outcome
  return { changed: true, fingerprint: options.memory.entry(options.name)?.fingerprint ?? '', ok: true, project: outcome.result === undefined ? undefined : toScanProject(outcome.result), remote: 'fresh', target: outcome.target }
}

/**
 * Check a project again on a fresh read of its clone, without fetch and without GitHub: the repo and the fork comparison stay as they were read
 * @param entry what is remembered about the project
 * @param options what watching needs
 * @param options.git how the clones are read
 * @param options.rules the rules split by flavor
 * @returns the new result
 */
async function checkAgain(entry: Readonly<MemoryEntry>, options: Readonly<Pick<LiveOptions, 'git' | 'rules'>>): Promise<ProjectResult> {
  const { local } = entry.result.project
  const fresh = { ...entry.result.project, local: local === undefined ? undefined : await options.git.readClone(local.path, { shouldFetch: false }) }
  return { ...(await checkOne(fresh, options.rules)), project: fresh }
}

/**
 * Watch a project: the page asks every few seconds, and the answer is cheap while nothing changed. The local side (files and git state) is fingerprinted with a few git calls, and when it changed the project is checked again from a fresh read of the clone, no GitHub call and no fetch. The GitHub side is read again only once the time to live passed and GitHub's rate limit allows it. Without anything remembered yet the project is scanned alone
 * @param options what to watch
 * @param options.gh runs gh
 * @param options.git how the clones are read
 * @param options.memory what the server remembers
 * @param options.name the repo name
 * @param options.owner the GitHub owner
 * @param options.rules the rules split by flavor
 * @param options.since the fingerprint the page got last time, empty on its first question
 * @param options.target the folder of projects
 * @returns that nothing changed, or the project as it is now, with the fingerprint to send back
 * @example const answer = await liveProject({ gh: ghCli, git: realGit, memory, name: 'finga', owner: 'Shuunen', rules, since: '', target })
 */
export async function liveProject(options: Readonly<LiveOptions>): Promise<LiveResult> {
  const { gh, memory, name, since } = options
  const first = memory.entry(name)
  if (first === undefined || (memory.isStale(first) && (await hasCalls(gh)))) return refreshAll(options)
  const entry = memory.isStale(first) ? memory.pause(first) : first
  const remote = entry.isPaused ? 'paused' : 'fresh'
  const fingerprint = await fingerprintClone(entry.result.project.local)
  if (fingerprint === entry.fingerprint && (since === '' || since === fingerprint)) return { changed: false, fingerprint, ok: true, remote }
  try {
    const result = await checkAgain(entry, options)
    memory.remember(result, fingerprint, entry)
    return { changed: true, fingerprint, ok: true, project: toScanProject(result), remote, target: options.target }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}
