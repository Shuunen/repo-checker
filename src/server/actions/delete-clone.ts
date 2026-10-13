import { rm } from 'node:fs/promises'
import path from 'node:path'
import { invariant } from 'es-toolkit'
import type { ActionResult, DeletePreview } from '../../shared/action.ts'
import { type ArchivedOptions, proveArchived } from './archived-proof.ts'
import { listIgnoredFiles } from './ignored-files.ts'

/**
 * Say what a delete of the clone would remove, after proving it is still safe. The files git ignores (a `.env`, a local database) are the only thing that would be lost, the rest is on GitHub
 * @param options what to delete
 * @returns the path and the ignored files, or the reason the delete is refused
 * @example const preview = await previewDeleteClone({ gh: ghCli, name: 'jozzo', owner: 'Shuunen', target })
 */
export async function previewDeleteClone(options: Readonly<ArchivedOptions>): Promise<DeletePreview> {
  try {
    const proof = await proveArchived(options, 'delete-clone')
    return proof.ok ? { ignoredFiles: await listIgnoredFiles(proof.clone.path), ok: true, path: proof.clone.path } : proof
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Delete the local clone of an archived repo, after proving again, from scratch, that it holds nothing that is not on GitHub. The folder is removed for good, nothing is touched on GitHub
 * @param options what to delete
 * @returns the result, refused with the reason when the proof fails
 * @example const result = await deleteClone({ gh: ghCli, name: 'jozzo', owner: 'Shuunen', target })
 */
export async function deleteClone(options: Readonly<ArchivedOptions>): Promise<ActionResult> {
  try {
    const proof = await proveArchived(options, 'delete-clone')
    if (!proof.ok) return proof
    invariant(path.dirname(proof.clone.path) === options.target, 'a clone is a direct child of the folder of projects')
    await rm(proof.clone.path, { force: true, recursive: true })
    return { message: `deleted the clone ${proof.clone.path}`, ok: true }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}
