import { type ActionResult, attempt, refused } from '../../shared/action.ts'
import { getRepo } from '../inventory/github.ts'
import { type ActionOptions, realRunGit } from './action-options.ts'
import { checkFolderOfProjects, requireCloneOf } from './guards.ts'

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
export function checkoutDefault({ gh, git, name, owner, runGit = realRunGit, target }: Readonly<ActionOptions>): Promise<ActionResult> {
  return attempt(async () => {
    const single = await checkFolderOfProjects(target)
    if (single !== undefined) return refused(single)
    const slug = `${owner}/${name}`
    const repo = await getRepo(gh, slug)
    if (repo === undefined) return refused(`${slug} does not exist on GitHub any more`)
    if (repo.isArchived) return refused(`${slug} is archived now, it is not offered a checkout`)
    const found = await requireCloneOf({ git, target }, repo.slug, { shouldFetch: false })
    if ('reason' in found) return found
    const { clone } = found
    if (clone.problem !== undefined) return refused(`the clone of ${repo.slug} cannot be read: ${clone.problem}`)
    if (clone.currentBranch === repo.defaultBranch) return refused(`the clone is already on ${repo.defaultBranch}`)
    if (clone.changedFiles.length > 0) return refused(`the clone has ${clone.changedFiles.length} uncommitted file(s), commit or discard them by hand first`)
    if (repo.defaultBranch.startsWith('-')) return refused(`${repo.defaultBranch} is not a branch name`)
    const { ok, stderr } = await runGit(['checkout', repo.defaultBranch], clone.path)
    return ok ? { message: `checked out ${repo.defaultBranch} in ${clone.path}`, ok } : { ok, reason: `git checkout ${repo.defaultBranch} failed: ${stderr.trim()}` }
  })
}
