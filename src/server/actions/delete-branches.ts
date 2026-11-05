import { fingerprintOf, staleReason } from './fingerprint.ts'
import { type ActionResult, attempt, type DeleteBranchesPreview, refused } from '../../shared/action.ts'
import type { LocalClone } from '../../shared/project.ts'
import { plural } from '../../shared/text.ts'
import { type ActionOptions, realRunGit } from './action-options.ts'
import { deleteBranches, proveClone } from './fix-git.ts'

/** What deleting the local branches needs */
interface DeleteBranchesOptions extends ActionOptions {
  /** The fingerprint of the list shown in the dialog, the delete is refused when the clone lists other branches now */
  fingerprint: string
}

/**
 * The local branches that can go: every one but the default branch and the checked out one, git cannot delete it
 * @param clone the clone
 * @param defaultBranch the default branch of the repo
 * @returns the branch names
 */
function deletableOf(clone: Readonly<LocalClone>, defaultBranch: string) {
  return clone.branches.map(branch => branch.name).filter(name => name !== defaultBranch && name !== clone.currentBranch)
}

/**
 * Say what a branch holds that would be lost with it, so the list tells what is risky
 * @param clone the clone
 * @param name the branch name
 * @returns the name, with a note when the branch has no upstream or commits that are not on it
 */
function describeBranch(clone: Readonly<LocalClone>, name: string) {
  const branch = clone.branches.find(item => item.name === name)
  if (branch?.upstream === undefined || branch.isGone) return `${name} (no upstream)`
  return branch.ahead > 0 ? `${name} (${plural(branch.ahead, 'commit')} not pushed)` : name
}

/**
 * Say which local branches would be deleted, read fresh with a fetch: all but the default and the checked out one, each with a note when it holds work that is not on GitHub
 * @param options what to delete
 * @returns the list with its fingerprint, or the reason there is nothing to do
 * @example const preview = await previewDeleteBranches({ gh: ghCli, git: realGit, name: 'app', owner: 'Shuunen', target })
 */
export function previewDeleteBranches(options: Readonly<ActionOptions>): Promise<DeleteBranchesPreview> {
  return attempt(async () => {
    const proof = await proveClone(options)
    if ('reason' in proof) return refused(proof.reason)
    const branches = deletableOf(proof.clone, proof.repo.defaultBranch)
    if (branches.length === 0) return refused(`there is no local branch but ${proof.repo.defaultBranch} and the checked out one`)
    return { branches: branches.map(name => describeBranch(proof.clone, name)), fingerprint: fingerprintOf(branches), ok: true, path: proof.clone.path }
  })
}

/**
 * Delete the local branches but the default one and the checked out one, forced, even the ones that hold work that is not on GitHub: the user saw the list. It proves everything again first, from scratch with a fresh fetch, and refuses unless the list is exactly the one the user saw. Nothing is touched on GitHub
 * @param options what to delete, with the fingerprint of the list the user confirmed
 * @param options.fingerprint the fingerprint of the list the user confirmed
 * @param options.runGit runs git in a folder, the real git by default
 * @returns the result, refused with the reason when the proof fails
 * @example const result = await deleteLocalBranches({ fingerprint: preview.fingerprint, gh: ghCli, git: realGit, name: 'app', owner: 'Shuunen', target })
 */
export function deleteLocalBranches({ fingerprint, runGit = realRunGit, ...options }: Readonly<DeleteBranchesOptions>): Promise<ActionResult> {
  return attempt(async () => {
    const proof = await proveClone(options)
    if ('reason' in proof) return refused(proof.reason)
    const branches = deletableOf(proof.clone, proof.repo.defaultBranch)
    if (fingerprintOf(branches) !== fingerprint) return refused(staleReason('the local branches of the clone are', 'deleted'))
    const failures = await deleteBranches(proof.clone, branches, runGit)
    if (failures.length > 0) return refused(`these branches could not be deleted: ${failures.join(' | ')}`)
    return { message: `deleted ${plural(branches.length, 'local branch')} of ${proof.clone.path}`, ok: true }
  })
}
