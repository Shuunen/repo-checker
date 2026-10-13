import { invariant } from 'es-toolkit'
import type { RescanResult } from '../../shared/scan-event.ts'
import { checkProjects } from '../check-projects.ts'
import type { SplitRules } from '../check-project.ts'
import { getRepo } from '../inventory/github.ts'
import { matchProjects } from '../inventory/match.ts'
import { toScanProject } from '../to-scan-project.ts'
import type { ActionOptions } from './action-options.ts'
import { checkFolderOfProjects, isRepoName } from './guards.ts'

/** What scanning one project again needs */
interface RescanOptions extends ActionOptions {
  /** The rules split by flavor */
  rules: SplitRules
}

/**
 * Scan one project again, after an action changed it: its repo from GitHub, its clone read with a fresh fetch, then the same checks as the scan. The page puts the answer in place of the project, so the rest of the list stays and the scan of everything is not redone
 * @param options what to scan
 * @param options.gh runs gh
 * @param options.git how the clones are read
 * @param options.name the repo name
 * @param options.owner the GitHub owner
 * @param options.rules the rules split by flavor
 * @param options.target the folder of projects
 * @returns the project as it is now, undefined when it is gone, or the reason it could not be scanned
 * @example const result = await rescanProject({ gh: ghCli, git: realGit, name: 'finga', owner: 'Shuunen', rules, target })
 */
export async function rescanProject({ gh, git, name, owner, rules, target }: Readonly<RescanOptions>): Promise<RescanResult> {
  try {
    if (!isRepoName(name)) return { ok: false, reason: `${name} is not a repo name` }
    const single = await checkFolderOfProjects(target)
    if (single !== undefined) return { ok: false, reason: single }
    const slug = `${owner}/${name}`
    const repo = await getRepo(gh, slug)
    const listed = await git.readClones(target, { shouldFetch: false })
    const found = listed.find(clone => clone.slug === slug.toLowerCase() || clone.folderName === name)
    const clone = found?.problem === undefined && found !== undefined ? await git.readClone(found.path, { shouldFetch: true }) : found
    const [project] = matchProjects(clone === undefined ? [] : [clone], repo === undefined ? [] : [repo], owner)
    if (project === undefined) return { ok: true, project: undefined }
    const [result] = await checkProjects([project], { gh, onProgress: () => undefined, onProject: () => undefined, refresh: undefined, rules })
    invariant(result !== undefined, 'one project gives one result')
    return { ok: true, project: toScanProject(result) }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}
