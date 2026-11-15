import { type ActionResult, attempt, type DeletePreview } from '../../../shared/action.ts'
import type { ActionOptions } from '../action-options.ts'
import { proveArchived } from '../archive/archived-proof.ts'
import { listIgnoredFiles } from './ignored-files.ts'
import { removeClone } from './remove-clone.ts'

/**
 * Say what a delete of the clone would remove, after proving it is still safe. The files git ignores (a `.env`, a local database) are the only thing that would be lost, the rest is on GitHub
 * @param options what to delete
 * @returns the path and the ignored files, or the reason the delete is refused
 * @example const preview = await previewDeleteClone({ gh: ghCli, name: 'jozzo', owner: 'Shuunen', target })
 */
export function previewDeleteClone(options: Readonly<ActionOptions>): Promise<DeletePreview> {
  return attempt(async () => {
    const proof = await proveArchived(options, 'delete-clone')
    return proof.ok ? { ignoredFiles: await listIgnoredFiles(proof.clone.path), ok: true, path: proof.clone.path } : proof
  })
}

/**
 * Delete the local clone of an archived repo, after proving again, from scratch, that it holds nothing that is not on GitHub. The folder is removed for good, nothing is touched on GitHub
 * @param options what to delete
 * @returns the result, refused with the reason when the proof fails
 * @example const result = await deleteClone({ gh: ghCli, name: 'jozzo', owner: 'Shuunen', target })
 */
export function deleteClone(options: Readonly<ActionOptions>): Promise<ActionResult> {
  return attempt(async () => {
    const proof = await proveArchived(options, 'delete-clone')
    if (!proof.ok) return proof
    await removeClone(proof.clone.path, options.target)
    return { message: `deleted the clone ${proof.clone.path}`, ok: true }
  })
}
