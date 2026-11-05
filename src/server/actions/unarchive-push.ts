import { type ActionResult, attempt, refused } from '../../shared/action.ts'
import type { LocalClone } from '../../shared/project.ts'
import { plural } from '../../shared/text.ts'
import { type GhRunner, getRepo } from '../inventory/github.ts'
import { type ActionOptions, realRunGit } from './action-options.ts'
import { proveArchived } from './archived-proof.ts'

/**
 * Say why the action cannot run while the clone holds work it would have to commit: it only pushes, it never creates a commit
 * @param clone the clone
 * @param clone.changedFiles the uncommitted files
 * @param clone.stashes the stash entries
 * @returns the reason to refuse, undefined when the clone holds only commits and branches
 */
function dirtyReason({ changedFiles, stashes }: Readonly<LocalClone>) {
  if (changedFiles.length > 0) return `the clone has ${plural(changedFiles.length, 'uncommitted file')}, this action only pushes and never creates a commit: commit or discard them by hand first`
  if (stashes.length > 0) return `the clone has ${plural(stashes.length, 'stash')}, this action only pushes: apply or drop them by hand first`
  return undefined
}

/**
 * The branches to push: every branch with unpushed commits and every local-only branch
 * @param clone the clone
 * @param clone.localOnlyBranches the branches with no upstream
 * @param clone.unpushed the unpushed commits per branch
 * @returns the branch names, once each
 */
function branchesToPush({ localOnlyBranches, unpushed }: Readonly<LocalClone>) {
  return [...new Set([...unpushed.map(item => item.branch), ...localOnlyBranches])]
}

/**
 * Set the archived flag of a repo on GitHub
 * @param gh runs gh
 * @param slug `owner/name`
 * @param isArchived the value to set
 * @returns the outcome of the call
 */
function setArchived(gh: GhRunner, slug: string, isArchived: boolean) {
  return gh(['api', '--method', 'PATCH', `repos/${slug}`, '-F', `archived=${isArchived}`])
}

/**
 * Read the repo back from GitHub and tell if it is archived, so a call that said ok but did nothing cannot pass. A repo that cannot be read counts as not archived: better to ask for a hand check than to hide a writable repo
 * @param gh runs gh
 * @param slug `owner/name`
 * @returns true when GitHub says the repo is archived
 */
async function isArchivedOnGitHub(gh: GhRunner, slug: string) {
  const repo = await getRepo(gh, slug).catch(() => undefined)
  return repo?.isArchived === true
}

/**
 * Unarchive, push, then archive again, always archive again: if the push fails the repo is still archived at the end, and the failure is reported. The repo is read back from GitHub to be sure. If archiving again fails or did nothing, the hand command is given
 * @param options what to act on
 * @param options.gh runs gh
 * @param options.name the repo name
 * @param options.owner the GitHub owner
 * @param options.runGit runs git, the real git by default
 * @param clone the clone
 * @returns the result
 */
async function pushThroughUnarchive({ gh, name, owner, runGit = realRunGit }: Readonly<ActionOptions>, clone: Readonly<LocalClone>): Promise<ActionResult> {
  const slug = `${owner}/${name}`
  const branches = branchesToPush(clone)
  const unarchived = await setArchived(gh, slug, false)
  if (!unarchived.ok) return refused(`could not unarchive ${slug}, nothing was pushed: ${unarchived.stderr.trim()}`)
  const pushed = await runGit(['push', 'origin', ...branches.map(branch => `refs/heads/${branch}:refs/heads/${branch}`)], clone.path)
  const archived = await setArchived(gh, slug, true)
  const isClosed = archived.ok && (await isArchivedOnGitHub(gh, slug))
  const outcome = pushed.ok ? `pushed ${plural(branches.length, 'branch')} (${branches.join(', ')})` : `git push failed: ${pushed.stderr.trim()}`
  if (!isClosed) return refused(`${outcome}, but ${slug} could not be archived again (${archived.ok ? 'GitHub still shows it as not archived' : archived.stderr.trim()}), archive it by hand: gh api --method PATCH repos/${slug} -F archived=true`)
  return pushed.ok ? { message: `${outcome} to ${slug}, which is archived again`, ok: true } : refused(`${outcome}. ${slug} is archived again, nothing was pushed`)
}

/**
 * Save the unpushed work of an archived repo: unarchive it, push every branch with unpushed commits and every local-only branch, archive it again. GitHub rejects a push to an archived repo, so this is the only way. It proves everything again first, from scratch with a fresh fetch, and it never creates a commit: it refuses while the clone has uncommitted files or a stash
 * @param options what to act on
 * @returns the result, refused with the reason when the proof fails
 * @example const result = await unarchivePush({ gh: ghCli, name: 'jozzo', owner: 'Shuunen', target })
 */
export function unarchivePush(options: Readonly<ActionOptions>): Promise<ActionResult> {
  return attempt(async () => {
    const proof = await proveArchived(options, 'unarchive-push')
    if (!proof.ok) return proof
    const reason = dirtyReason(proof.clone)
    return reason === undefined ? await pushThroughUnarchive(options, proof.clone) : { ok: false, reason }
  })
}
