import { rm } from 'node:fs/promises'
import path from 'node:path'
import { invariant } from 'es-toolkit'
import { refused, type Refused } from '../../../shared/action.ts'
import type { GhRunner } from '../../inventory/github.ts'
import { missingDeleteScope, refreshCommand } from './delete-scope.ts'

/**
 * Say why a folder cannot be removed as a clone: only a direct child of the folder of projects can be. Checked before anything is deleted, on GitHub or on disk
 * @param folder the clone folder
 * @param target the folder of projects
 * @returns the refusal, undefined when the folder can be removed
 * @example cloneFolderRefusal('/projects/app', '/projects') // undefined
 */
export function cloneFolderRefusal(folder: string, target: string): Refused | undefined {
  return path.dirname(folder) === target ? undefined : refused(`${folder} is not directly in ${target}, nothing was deleted`)
}

/**
 * Remove the folder of a clone, for good, only when it is a direct child of the folder of projects
 * @param folder the clone folder
 * @param target the folder of projects
 * @example await removeClone('/projects/app', '/projects')
 */
export async function removeClone(folder: string, target: string) {
  invariant(cloneFolderRefusal(folder, target) === undefined, 'a clone is a direct child of the folder of projects')
  await rm(folder, { force: true, recursive: true })
}

/**
 * Delete a repo on GitHub, for good. It is refused before the call when the token has no `delete_repo` scope, and a 403 gives the command that adds it
 * @param gh runs gh
 * @param slug `owner/name` of the repo
 * @returns the refusal, undefined when the repo is deleted
 * @example const refusal = await deleteRepoOnGithub(ghCli, 'Shuunen/old-thing')
 */
export async function deleteRepoOnGithub(gh: GhRunner, slug: string): Promise<Refused | undefined> {
  const scope = await missingDeleteScope(gh)
  if (scope !== undefined) return refused(scope)
  const deleted = await gh(['api', '--method', 'DELETE', `repos/${slug}`])
  if (deleted.ok) return undefined
  return refused(`GitHub refused to delete ${slug}: ${deleted.stderr.trim()}${deleted.stderr.includes('403') ? `. If the token has no delete_repo scope, run: ${refreshCommand}` : ''}`)
}
