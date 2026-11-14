import { type ActionResult, attempt, type ForkDeletePreview } from '../../../shared/action.ts'
import type { ActionOptions } from '../action-options.ts'
import { proveFork } from './fork-proof.ts'
import { listIgnoredFiles } from './ignored-files.ts'
import { cloneFolderRefusal, deleteRepoOnGithub, removeClone } from './remove-clone.ts'

/**
 * Say what deleting the fork would remove: the fork on GitHub, and its clean local clone with the ignored files in it, after proving again that it is a pristine fork
 * @param options what to delete
 * @returns the parent, how many branches were compared, the clone to delete too, or the reason the delete is refused
 * @example const preview = await previewDeleteFork({ gh: ghCli, git: realGit, name: 'qbt-theme', owner: 'Shuunen', target })
 */
export function previewDeleteFork(options: Readonly<ActionOptions>): Promise<ForkDeletePreview> {
  return attempt(async () => {
    const proof = await proveFork(options)
    if (!proof.ok) return proof
    const { clone, status } = proof
    return { branches: status.branches.length, clone: clone && { ignoredFiles: await listIgnoredFiles(clone.path), path: clone.path }, ok: true, parent: status.parent }
  })
}

/**
 * Delete a pristine fork on GitHub, for good, and then its clean local clone if it has one. It proves everything again first, from scratch: GitHub first, so a refused delete leaves the clone alone. If GitHub refuses with 403 the reason gives the command that adds the `delete_repo` scope
 * @param options what to delete
 * @returns the result, refused with the reason when the proof fails
 * @example const result = await deleteFork({ gh: ghCli, git: realGit, name: 'qbt-theme', owner: 'Shuunen', target })
 */
export function deleteFork(options: Readonly<ActionOptions>): Promise<ActionResult> {
  return attempt(async () => {
    const proof = await proveFork(options)
    if (!proof.ok) return proof
    const slug = `${options.owner}/${options.name}`
    const misplaced = proof.clone && cloneFolderRefusal(proof.clone.path, options.target)
    if (misplaced !== undefined) return misplaced
    const refusal = await deleteRepoOnGithub(options.gh, slug)
    if (refusal !== undefined) return refusal
    if (proof.clone === undefined) return { message: `deleted the fork ${slug} on GitHub`, ok: true }
    await removeClone(proof.clone.path, options.target)
    return { message: `deleted the fork ${slug} on GitHub and its clone ${proof.clone.path}`, ok: true }
  })
}
