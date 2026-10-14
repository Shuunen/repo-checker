import type { ActionResult } from '../../shared/action.ts'
import { getRepo } from '../inventory/github.ts'
import { run, type ShellResult } from '../inventory/shell.ts'
import type { ActionOptions } from './action-options.ts'
import { checkFolderOfProjects, isRepoName } from './guards.ts'

/** What a checkout of the default branch needs */
interface CheckoutOptions extends ActionOptions {
  /** Runs git in the given folder */
  runGit?: (args: readonly string[], cwd: string) => Promise<ShellResult>
}

/**
 * Check out the default branch of GitHub in the clone of a repo, after proving again that the scan was right: the repo is still there and not archived, the clone is usable, still on another branch, and holds no uncommitted file. Nothing is created or thrown away, git only moves HEAD, and refuses itself if the branch cannot be reached
 * @param options what to check out
 * @param options.gh runs gh
 * @param options.git how the clones are read
 * @param options.name the repo name
 * @param options.owner the GitHub owner
 * @param options.runGit runs git in a folder, the real git by default
 * @param options.target the folder of projects
 * @returns the result, refused with the reason when the proof fails
 * @example const result = await checkoutDefault({ gh: ghCli, git: realGit, name: 'finga', owner: 'Shuunen', target })
 */
export async function checkoutDefault({ gh, git, name, owner, runGit = (args, cwd) => run('git', args, cwd), target }: Readonly<CheckoutOptions>): Promise<ActionResult> {
  try {
    if (!isRepoName(name)) return { ok: false, reason: `${name} is not a repo name` }
    const single = await checkFolderOfProjects(target)
    if (single !== undefined) return { ok: false, reason: single }
    const slug = `${owner}/${name}`
    const repo = await getRepo(gh, slug)
    if (repo === undefined) return { ok: false, reason: `${slug} does not exist on GitHub any more` }
    if (repo.isArchived) return { ok: false, reason: `${slug} is archived now, it is not offered a checkout` }
    const listed = await git.readClones(target, { shouldFetch: false })
    const matches = listed.filter(clone => clone.slug === repo.slug)
    const [found] = matches
    if (found === undefined || matches.length > 1) return { ok: false, reason: `expected one clone of ${repo.slug} in ${target}, found ${matches.length}` }
    const clone = await git.readClone(found.path, { shouldFetch: false })
    if (clone.problem !== undefined) return { ok: false, reason: `the clone of ${repo.slug} cannot be read: ${clone.problem}` }
    if (clone.currentBranch === repo.defaultBranch) return { ok: false, reason: `the clone is already on ${repo.defaultBranch}` }
    if (clone.changedFiles.length > 0) return { ok: false, reason: `the clone has ${clone.changedFiles.length} uncommitted file(s), commit or discard them by hand first` }
    if (repo.defaultBranch.startsWith('-')) return { ok: false, reason: `${repo.defaultBranch} is not a branch name` }
    const { ok, stderr } = await runGit(['checkout', repo.defaultBranch], clone.path)
    return ok ? { message: `checked out ${repo.defaultBranch} in ${clone.path}`, ok } : { ok, reason: `git checkout ${repo.defaultBranch} failed: ${stderr.trim()}` }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}
