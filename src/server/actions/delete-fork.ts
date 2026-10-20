import { rm } from 'node:fs/promises'
import path from 'node:path'
import { invariant } from 'es-toolkit'
import { type ActionResult, attempt, type ForkDeletePreview, refused } from '../../shared/action.ts'
import type { ActionOptions } from './action-options.ts'
import { refreshCommand } from './delete-scope.ts'
import { proveFork } from './fork-proof.ts'
import { listIgnoredFiles } from './ignored-files.ts'

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
    const deleted = await options.gh(['api', '--method', 'DELETE', `repos/${slug}`])
    if (!deleted.ok) return refused(`GitHub refused to delete ${slug}: ${deleted.stderr.trim()}${deleted.stderr.includes('403') ? `. If the token has no delete_repo scope, run: ${refreshCommand}` : ''}`)
    if (proof.clone === undefined) return { message: `deleted the fork ${slug} on GitHub`, ok: true }
    invariant(path.dirname(proof.clone.path) === options.target, 'a clone is a direct child of the folder of projects')
    await rm(proof.clone.path, { force: true, recursive: true })
    return { message: `deleted the fork ${slug} on GitHub and its clone ${proof.clone.path}`, ok: true }
  })
}
