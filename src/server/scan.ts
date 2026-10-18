import type { LocalClone } from '../shared/project.ts'
import { checkProjects, type ProjectResult } from './check-projects.ts'
import { readFleet, rememberFleet } from './fleet.ts'
import type { AnyRule } from './engine/define-project-rule.ts'
import { activeRules, splitRules } from './engine/load-rules.ts'
import type { GhRunner } from './inventory/github.ts'
import { readClone } from './inventory/git.ts'
import { matchProjects } from './inventory/match.ts'
import type { ProjectMemory } from './project-memory.ts'
import { type Progress, readInventory } from './inventory/read-inventory.ts'

/** What a scan needs */
export interface ScanOptions {
  /** Runs gh, the real CLI or a fake */
  gh: GhRunner
  /** Remembers the results between scans, undefined to remember nothing */
  memory?: ProjectMemory | undefined
  /** True to run the nitpick rules too */
  isNitpick?: boolean | undefined
  /** The GitHub owner to compare with, detected when undefined */
  owner: string | undefined
  /** The rules of both flavors */
  rules: readonly AnyRule[]
  /** Run `git fetch --prune` in each clone right before its own check, so unpushed work is measured against the real remote and no project waits for another's fetch */
  shouldFetch: boolean
  /** False to check every project even when the memory holds its result, a scan the user asked to be fresh */
  shouldReuse?: boolean | undefined
  /** The folder to scan: a git repo (single project mode) or a folder of repos */
  target: string
}

/** Callbacks to follow a scan while it runs */
export interface ScanHooks {
  /** Called as soon as each project is checked, for live output */
  onProject?: (result: ProjectResult) => void
  /** Receives a short line about what the scan is doing */
  onProgress?: Progress
}

/**
 * Scan a target: read the clones and the owner's repos, match them, then check each project, see `checkProjects`
 * @param options the options
 * @param hooks callbacks to follow the scan
 * @param hooks.onProject called as soon as each project is checked, for live output
 * @param hooks.onProgress receives a short line about what the scan is doing
 * @returns the owner compared with, whether the target is a single project, and one result per project sorted by name
 * @throws {Error} when gh fails, for example when it is not logged in
 * @example const { projects } = await scan({ gh: ghCli, owner: undefined, rules, shouldFetch: true, target: process.cwd() })
 */
export async function scan(options: Readonly<ScanOptions>, { onProject = () => undefined, onProgress = () => undefined }: Readonly<ScanHooks> = {}) {
  const { clones, isSingle, owner, repos } = await readInventory(options.gh, { ...options, onProgress })
  const refresh = options.shouldFetch ? (local: LocalClone) => readClone(local.path, { shouldFetch: true }) : undefined
  const matched = matchProjects(clones, repos, owner)
  const fleet = await readFleet(matched)
  rememberFleet(fleet)
  const projects = await checkProjects(matched, { fleet, gh: options.gh, memory: options.memory, onProgress, onProject, refresh, rules: splitRules(activeRules(options.rules, options.isNitpick === true)), shouldReuse: options.shouldReuse })
  return { isSingle, owner, projects }
}
