import { type ActionResult, attempt, refused } from '../../../shared/action.ts'
import { settingFixes } from '../../../shared/repo-settings.ts'
import { getRepo } from '../../inventory/github.ts'
import type { ActionOptions } from '../action-options.ts'

/**
 * Set the repo settings the checks want on GitHub: the branches deleted once merged, no merge commit, the secret scanning. Only the ones that are not set yet are changed, after proving again that the repo is still there, still the same one and not archived. The repo is read back from GitHub to be sure a call that said ok did something
 * @param options what to change
 * @param options.gh runs gh
 * @param options.name the repo name
 * @param options.owner the GitHub owner
 * @returns the result, refused with the reason when the proof fails
 * @example const result = await fixGithubSettings({ gh: ghCli, git: realGit, name: 'app', owner: 'Shuunen', target })
 */
export function fixGithubSettings({ gh, name, owner }: Readonly<ActionOptions>): Promise<ActionResult> {
  return attempt(async () => {
    const slug = `${owner}/${name}`
    const repo = await getRepo(gh, slug)
    if (repo === undefined) return refused(`${slug} does not exist on GitHub any more`)
    if (repo.slug !== slug.toLowerCase()) return refused(`${slug} was renamed or moved to ${repo.slug}, scan again`)
    if (repo.isArchived) return refused(`${slug} is archived, GitHub does not let its settings change`)
    const fixes = settingFixes(repo)
    if (fixes.length === 0) return refused(`${slug} has these settings already, or GitHub does not show them to you`)
    const patched = await gh(['api', '--method', 'PATCH', `repos/${slug}`, ...fixes.flatMap(fix => fix.args)])
    if (!patched.ok) return refused(`GitHub refused to change the settings of ${slug}: ${patched.stderr.trim()}`)
    const left = settingFixes((await getRepo(gh, slug)) ?? repo)
    return left.length === 0 ? { message: `set on ${slug}: ${fixes.map(fix => fix.label).join(', ')}`, ok: true } : refused(`GitHub said ok but ${slug} still has ${left.length} setting${left.length === 1 ? '' : 's'} to fix, set them by hand: ${left.map(fix => fix.label).join(', ')}`)
  })
}
