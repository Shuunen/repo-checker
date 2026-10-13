import type { ActionResult } from '../../shared/action.ts'
import type { LocalClone } from '../../shared/project.ts'
import { plural } from '../../shared/text.ts'
import type { GhRunner } from '../inventory/github.ts'
import { run } from '../inventory/shell.ts'
import type { ActionOptions } from './action-options.ts'
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
 * Push the branches to origin in one command, never forced, so what GitHub has is never rewritten
 * @param folder the clone
 * @param branches the branches
 * @returns the outcome of the push
 */
function pushBranches(folder: string, branches: readonly string[]) {
  return run('git', ['push', 'origin', ...branches.map(branch => `refs/heads/${branch}:refs/heads/${branch}`)], folder)
}

/**
 * Unarchive, push, then archive again, always archive again: if the push fails the repo is still archived at the end, and the failure is reported. If archiving again fails, the hand command is given
 * @param gh runs gh
 * @param clone the clone
 * @param slug `owner/name`
 * @returns the result
 */
async function pushThroughUnarchive(gh: GhRunner, clone: Readonly<LocalClone>, slug: string): Promise<ActionResult> {
  const branches = branchesToPush(clone)
  const unarchived = await setArchived(gh, slug, false)
  if (!unarchived.ok) return { ok: false, reason: `could not unarchive ${slug}, nothing was pushed: ${unarchived.stderr.trim()}` }
  const pushed = await pushBranches(clone.path, branches)
  const archived = await setArchived(gh, slug, true)
  const outcome = pushed.ok ? `pushed ${plural(branches.length, 'branch')} (${branches.join(', ')})` : `git push failed: ${pushed.stderr.trim()}`
  if (!archived.ok) return { ok: false, reason: `${outcome}, but ${slug} could not be archived again (${archived.stderr.trim()}), archive it by hand: gh api --method PATCH repos/${slug} -F archived=true` }
  return pushed.ok ? { message: `${outcome} to ${slug}, which is archived again`, ok: true } : { ok: false, reason: `${outcome}. ${slug} is archived again, nothing was pushed` }
}

/**
 * Save the unpushed work of an archived repo: unarchive it, push every branch with unpushed commits and every local-only branch, archive it again. GitHub rejects a push to an archived repo, so this is the only way. It proves everything again first, from scratch with a fresh fetch, and it never creates a commit: it refuses while the clone has uncommitted files or a stash
 * @param options what to act on
 * @returns the result, refused with the reason when the proof fails
 * @example const result = await unarchivePush({ gh: ghCli, name: 'jozzo', owner: 'Shuunen', target })
 */
export async function unarchivePush(options: Readonly<ActionOptions>): Promise<ActionResult> {
  try {
    const proof = await proveArchived(options, 'unarchive-push-rearchive')
    if (!proof.ok) return proof
    const reason = dirtyReason(proof.clone)
    return reason === undefined ? await pushThroughUnarchive(options.gh, proof.clone, `${options.owner}/${options.name}`) : { ok: false, reason }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}
