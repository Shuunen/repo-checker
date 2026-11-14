import { type ActionResult, attempt, type ProjectDeletePreview, refused } from '../../../shared/action.ts'
import type { GithubRepo, LocalClone } from '../../../shared/project.ts'
import { getRepo } from '../../inventory/github.ts'
import type { ActionOptions } from '../action-options.ts'
import { fingerprintOf, staleReason } from '../dialog-fingerprint.ts'
import { checkFolderOfProjects } from '../guards.ts'
import { missingDeleteScope } from './delete-scope.ts'
import { cloneFolderRefusal, deleteRepoOnGithub, removeClone } from './remove-clone.ts'
import { lostWith } from './unsaved-summary.ts'

/** What a delete of a project would remove */
type Found = { clone: LocalClone | undefined; ok: true; repo: GithubRepo | undefined } | { ok: false; reason: string }

/** What deleting a project needs: the fingerprint of what the dialog listed */
interface DeleteProjectOptions extends ActionOptions {
  /** The fingerprint of what the dialog listed, the delete is refused when the repo or the clone hold something else now */
  fingerprint: string
}

/**
 * Find what a delete would remove, read fresh: the repo of the owner on GitHub if there is one, and its clone in the folder of projects if there is one. With no repo on GitHub, a folder of the same name is only matched when its origin is not a GitHub repo, a clone of someone else's repo is never picked by its name
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
  const matches = clones.filter(clone => clone.slug === slug.toLowerCase() || (repo === undefined && clone.slug === undefined && clone.folderName === name))
  if (matches.length > 1) return refused(`${matches.length} clones of ${slug} in ${target}, delete the extra ones by hand`)
  const [match] = matches
  if (repo === undefined && match === undefined) return refused(`${slug} is neither on GitHub nor in ${target}, nothing to delete`)
  const clone = match && (await git.readClone(match.path, { shouldFetch: false }))
  const misplaced = clone && cloneFolderRefusal(clone.path, target)
  return misplaced ?? { clone, ok: true, repo }
}

/**
 * Say what the delete removes, the list the dialog shows and the fingerprint covers
 * @param found what the delete would remove
 * @param found.clone the clone, if any
 * @param found.repo the repo on GitHub, if any
 * @returns the repo slug and the clone with what would be lost
 */
async function listed({ clone, repo }: Readonly<{ clone: LocalClone | undefined; repo: GithubRepo | undefined }>) {
  return { clone: clone && (await lostWith(clone)), repo: repo?.slug }
}

/**
 * Say what deleting the project would remove: its repo on GitHub, and its local clone with everything that exists nowhere else, the unsaved work and the files git ignores, with the fingerprint of that list
 * @param options what to delete
 * @returns the repo, the clone with what would be lost and the fingerprint, or the reason the delete is refused
 * @example const preview = await previewDeleteProject({ gh: ghCli, git: realGit, name: 'old-thing', owner: 'Shuunen', target })
 */
export function previewDeleteProject(options: Readonly<ActionOptions>): Promise<ProjectDeletePreview> {
  return attempt(async () => {
    const found = await findProject(options)
    if (!found.ok) return found
    const scope = found.repo === undefined ? undefined : await missingDeleteScope(options.gh)
    if (scope !== undefined) return refused(scope)
    const list = await listed(found)
    return { ...list, fingerprint: fingerprintOf(list), ok: true }
  })
}

/**
 * Delete a project for good: its repo on GitHub first, so a refused delete leaves the clone alone, then its local clone, whatever it holds. It reads everything again first and refuses unless the repo and the clone hold exactly what the dialog listed. If GitHub refuses with 403 the reason gives the command that adds the `delete_repo` scope
 * @param options what to delete, with the fingerprint of what the dialog listed
 * @param options.fingerprint the fingerprint of what the dialog listed
 * @returns the result, refused with the reason when it cannot be done
 * @example const result = await deleteProject({ fingerprint: preview.fingerprint, gh: ghCli, git: realGit, name: 'old-thing', owner: 'Shuunen', target })
 */
export function deleteProject({ fingerprint, ...options }: Readonly<DeleteProjectOptions>): Promise<ActionResult> {
  return attempt(async () => {
    const found = await findProject(options)
    if (!found.ok) return found
    if (fingerprintOf(await listed(found)) !== fingerprint) return refused(staleReason('the repo and the clone are', 'deleted'))
    const { clone, repo } = found
    const refusal = repo === undefined ? undefined : await deleteRepoOnGithub(options.gh, repo.slug)
    if (refusal !== undefined) return refusal
    if (clone !== undefined) await removeClone(clone.path, options.target)
    const done = [repo && `the repo ${repo.slug} on GitHub`, clone && `the clone ${clone.path}`].filter(Boolean)
    return { message: `deleted ${done.join(' and ')}`, ok: true }
  })
}
