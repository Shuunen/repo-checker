import { type ActionResult, attempt, refused } from '../../shared/action.ts'
import { getRepo } from '../inventory/github.ts'
import type { ActionOptions } from './action-options.ts'

/**
 * Set the archived flag of the repo on GitHub, after proving again that it is still there, still the same repo and not in that state already. Nothing is deleted. The repo is read back from GitHub to be sure a call that said ok did something
 * @param options what to change
 * @param options.gh runs gh
 * @param options.name the repo name
 * @param options.owner the GitHub owner
 * @param isArchived the value to set
 * @returns the result, refused with the reason when the proof fails
 */
function setArchived({ gh, name, owner }: Readonly<ActionOptions>, isArchived: boolean): Promise<ActionResult> {
  const verb = isArchived ? 'archive' : 'unarchive'
  return attempt(async () => {
    const slug = `${owner}/${name}`
    const repo = await getRepo(gh, slug)
    if (repo === undefined) return refused(`${slug} does not exist on GitHub any more`)
    if (repo.slug !== slug.toLowerCase()) return refused(`${slug} was renamed or moved to ${repo.slug}, scan again`)
    if (repo.isArchived === isArchived) return refused(`${slug} is already ${isArchived ? 'archived' : 'not archived'}`)
    const patched = await gh(['api', '--method', 'PATCH', `repos/${slug}`, '-F', `archived=${isArchived}`])
    if (!patched.ok) return refused(`GitHub refused to ${verb} ${slug}: ${patched.stderr.trim()}`)
    const after = await getRepo(gh, slug)
    return after?.isArchived === isArchived ? { message: `${verb}d ${slug} on GitHub`, ok: true } : refused(`GitHub said ok but ${slug} did not change, ${verb} it by hand: gh api --method PATCH repos/${slug} -F archived=${isArchived}`)
  })
}

/**
 * Archive the repo on GitHub, after proving again that it is still there, writable and the same repo. Nothing is deleted, it can be unarchived
 * @param options what to archive
 * @returns the result, refused with the reason when the proof fails
 * @example const result = await archiveRepo({ gh: ghCli, git: realGit, name: 'old-thing', owner: 'Shuunen', target })
 */
export function archiveRepo(options: Readonly<ActionOptions>) {
  return setArchived(options, true)
}

/**
 * Unarchive the repo on GitHub, after proving again that it is still there, archived and the same repo
 * @param options what to unarchive
 * @returns the result, refused with the reason when the proof fails
 * @example const result = await unarchiveRepo({ gh: ghCli, git: realGit, name: 'old-thing', owner: 'Shuunen', target })
 */
export function unarchiveRepo(options: Readonly<ActionOptions>) {
  return setArchived(options, false)
}
