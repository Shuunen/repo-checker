import { rm } from 'node:fs/promises'
import path from 'node:path'
import { invariant } from 'es-toolkit'
import { type ActionResult, attempt, type ProjectDeletePreview, refused } from '../../shared/action.ts'
import type { GithubRepo, LocalClone } from '../../shared/project.ts'
import { getRepo } from '../inventory/github.ts'
import type { ActionOptions } from './action-options.ts'
import { missingDeleteScope, refreshCommand } from './delete-scope.ts'
import { checkFolderOfProjects } from './guards.ts'
import { lostWith } from './unsaved-summary.ts'

/** What a delete of a project would remove */
type Found = { clone: LocalClone | undefined; ok: true; repo: GithubRepo | undefined } | { ok: false; reason: string }

/**
 * Find what a delete would remove, read fresh: the repo of the owner on GitHub if there is one, and its clone in the folder of projects if there is one
 * @param options what to delete
 * @param options.gh runs gh
 * @param options.git how the clones are read
 * @param options.name the repo name
 * @param options.owner the GitHub owner
 * @param options.target the folder of projects
 * @returns the repo and the clone, either can be missing, or the reason to refuse
 * @throws {Error} when gh fails for a reason other than a 404
 */
async function findProject({ gh, git, name, owner, target }: Readonly<ActionOptions>): Promise<Found> {
  const single = await checkFolderOfProjects(target)
  if (single !== undefined) return refused(single)
  const slug = `${owner}/${name}`
  const repo = await getRepo(gh, slug)
  if (repo !== undefined && repo.slug !== slug.toLowerCase()) return refused(`${slug} was renamed or moved to ${repo.slug}, scan again`)
  const clones = await git.listClones(target)
  const matches = clones.filter(clone => clone.slug === slug.toLowerCase() || (repo === undefined && clone.folderName === name))
  if (matches.length > 1) return refused(`${matches.length} clones of ${slug} in ${target}, delete the extra ones by hand`)
  const [match] = matches
  if (repo === undefined && match === undefined) return refused(`${slug} is neither on GitHub nor in ${target}, nothing to delete`)
  return { clone: match && (await git.readClone(match.path, { shouldFetch: false })), ok: true, repo }
}

/**
 * Delete the repo on GitHub, for good. If GitHub refuses with 403 the reason gives the command that adds the `delete_repo` scope
 * @param options what to delete
 * @param options.gh runs gh
 * @param options.name the repo name
 * @param options.owner the GitHub owner
 * @param slug `owner/name` of the repo
 * @returns the reason it was refused, undefined when it is deleted
 */
async function deleteRepo({ gh, name, owner }: Readonly<ActionOptions>, slug: string): Promise<ActionResult | undefined> {
  const scope = await missingDeleteScope(gh)
  if (scope !== undefined) return refused(scope)
  const deleted = await gh(['api', '--method', 'DELETE', `repos/${owner}/${name}`])
  if (deleted.ok) return undefined
  return refused(`GitHub refused to delete ${slug}: ${deleted.stderr.trim()}${deleted.stderr.includes('403') ? `. If the token has no delete_repo scope, run: ${refreshCommand}` : ''}`)
}

/**
 * Remove the folder of a clone, only when it is a direct child of the folder of projects
 * @param folder the clone folder
 * @param target the folder of projects
 */
async function removeClone(folder: string, target: string) {
  invariant(path.dirname(folder) === target, 'a clone is a direct child of the folder of projects')
  await rm(folder, { force: true, recursive: true })
}

/**
 * Say what deleting the project would remove: its repo on GitHub, and its local clone with everything that exists nowhere else, the unsaved work and the files git ignores
 * @param options what to delete
 * @returns the repo, the clone with what would be lost, or the reason the delete is refused
 * @example const preview = await previewDeleteProject({ gh: ghCli, git: realGit, name: 'old-thing', owner: 'Shuunen', target })
 */
export function previewDeleteProject(options: Readonly<ActionOptions>): Promise<ProjectDeletePreview> {
  return attempt(async () => {
    const found = await findProject(options)
    if (!found.ok) return found
    const { clone, repo } = found
    const scope = repo === undefined ? undefined : await missingDeleteScope(options.gh)
    if (scope !== undefined) return refused(scope)
    return { clone: clone && (await lostWith(clone)), ok: true, repo: repo?.slug }
  })
}

/**
 * Delete a project for good: its repo on GitHub first, so a refused delete leaves the clone alone, then its local clone, whatever it holds. The confirmation listed what is lost. If GitHub refuses with 403 the reason gives the command that adds the `delete_repo` scope
 * @param options what to delete
 * @returns the result, refused with the reason when it cannot be done
 * @example const result = await deleteProject({ gh: ghCli, git: realGit, name: 'old-thing', owner: 'Shuunen', target })
 */
export function deleteProject(options: Readonly<ActionOptions>): Promise<ActionResult> {
  return attempt(async () => {
    const found = await findProject(options)
    if (!found.ok) return found
    const { clone, repo } = found
    const refusal = repo === undefined ? undefined : await deleteRepo(options, repo.slug)
    if (refusal !== undefined) return refusal
    if (clone !== undefined) await removeClone(clone.path, options.target)
    const done = [repo && `the repo ${repo.slug} on GitHub`, clone && `the clone ${clone.path}`].filter(Boolean)
    return { message: `deleted ${done.join(' and ')}`, ok: true }
  })
}
