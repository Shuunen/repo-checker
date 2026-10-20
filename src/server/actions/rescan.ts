import { invariant } from 'es-toolkit'
import { checkProjects, type ProjectResult } from '../check-projects.ts'
import type { SplitRules } from '../check-project.ts'
import { getRepo } from '../inventory/github.ts'
import { matchProjects } from '../inventory/match.ts'
import { fingerprintClone, type ProjectMemory } from '../project-memory.ts'
import type { ActionOptions } from './action-options.ts'
import { checkFolderOfProjects } from './guards.ts'
import { attempt, refused, type Refusable } from '../../shared/action.ts'

/** What scanning one project again needs */
export interface RescanOptions extends ActionOptions {
  /** Remembers the result, so the watch of the project starts from it and a scan can reuse it */
  memory?: ProjectMemory
  /** The rules split by flavor */
  rules: SplitRules
}

/** What scanning one project again found: the checked project, undefined when it is gone, or the reason it could not be scanned */
export type RescanOutcome = Refusable<{ result: ProjectResult | undefined; target: string }>

/**
 * Scan one project again and keep the result as it is checked: its repo from GitHub, its clone read with a fresh fetch, then the same checks as the scan. The pull request counts, the CI status and the date of the last own commit, which only a full scan reads, are kept from what the memory holds
 * @param options what to scan
 * @param options.gh runs gh
 * @param options.git how the clones are read
 * @param options.memory remembers the result
 * @param options.name the repo name
 * @param options.owner the GitHub owner
 * @param options.rules the rules split by flavor
 * @param options.target the folder of projects
 * @returns the checked project, undefined when it is gone, or the reason it could not be scanned
 * @example const outcome = await rescanResult({ gh: ghCli, git: realGit, name: 'finga', owner: 'Shuunen', rules, target })
 */
export function rescanResult({ gh, git, memory, name, owner, rules, target }: Readonly<RescanOptions>): Promise<RescanOutcome> {
  return attempt(async () => {
    const single = await checkFolderOfProjects(target)
    if (single !== undefined) return refused(single)
    const slug = `${owner}/${name}`
    const found = await getRepo(gh, slug)
    const kept = memory?.entry(name)?.result.project.github
    const repo = found !== undefined && kept !== undefined ? { ...found, ci: kept.ci, lastOwnCommitAt: kept.lastOwnCommitAt, pullRequests: kept.pullRequests } : found
    const listed = await git.listClones(target)
    const listedClone = listed.find(clone => clone.slug === slug.toLowerCase() || clone.folderName === name)
    const fingerprint = await fingerprintClone(listedClone)
    const clone = listedClone && (await git.readClone(listedClone.path, { shouldFetch: listedClone.problem === undefined }))
    const [project] = matchProjects(clone === undefined ? [] : [clone], repo === undefined ? [] : [repo], owner)
    if (project === undefined) {
      memory?.forget(name)
      return { ok: true, result: undefined, target }
    }
    const [result] = await checkProjects([project], { gh, onProgress: () => undefined, onProject: () => undefined, refresh: undefined, rules })
    invariant(result !== undefined, 'one project gives one result')
    memory?.remember(result, fingerprint)
    return { ok: true, result, target }
  })
}
