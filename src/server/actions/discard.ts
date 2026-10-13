import { createHash } from 'node:crypto'
import type { ActionResult, DiscardPreview } from '../../shared/action.ts'
import type { LocalClone } from '../../shared/project.ts'
import { type UnsavedGroup, unsavedGroups } from '../../shared/unsaved.ts'
import { run } from '../inventory/shell.ts'
import type { ActionOptions } from './action-options.ts'
import { proveArchived } from './archived-proof.ts'

/** What discarding needs: the fingerprint of the list the user confirmed */
interface DiscardOptions extends ActionOptions {
  /** The fingerprint of the list shown in the dialog, the discard is refused when the clone does not hold exactly that any more */
  fingerprint: string
}

/** A git command to run in the clone, as an argument array */
type Step = readonly string[]

/**
 * Fingerprint a list of unsaved items, so the discard can be refused when it is not the list the user saw
 * @param groups the groups of unsaved items
 * @returns a hash of the list
 * @example fingerprintOf(unsavedGroups(clone))
 */
function fingerprintOf(groups: readonly UnsavedGroup[]) {
  return createHash('sha256').update(JSON.stringify(groups)).digest('hex')
}

/**
 * Plan the git steps that bring the clone back to the remote state: drop the stashes, land on a branch that exists on GitHub, reset every branch that is ahead to its upstream, remove the uncommitted and untracked files (the ignored ones stay), delete the local-only branches
 * @param clone the clone
 * @param defaultBranch the default branch of GitHub, undefined when unknown
 * @returns the steps, or the reason there is nowhere to land
 */
function planSteps(clone: Readonly<LocalClone>, defaultBranch: string | undefined): { steps: Step[] } | { reason: string } {
  const upstreams = new Map(clone.branches.flatMap(branch => (branch.upstream === undefined || branch.isGone ? [] : [[branch.name, branch.upstream] as const])))
  const landing = upstreams.has(clone.currentBranch) ? clone.currentBranch : [defaultBranch, ...upstreams.keys()].find(name => name !== undefined && upstreams.has(name))
  const landingUpstream = landing === undefined ? undefined : upstreams.get(landing)
  if (landing === undefined || landingUpstream === undefined) return { reason: 'no branch of the clone exists on GitHub, so there is nowhere to go back to: delete the clone by hand if it is worthless' }
  const resets = clone.branches.flatMap(branch => (branch.ahead > 0 && branch.name !== landing && branch.upstream !== undefined && !branch.isGone ? [['branch', '--force', branch.name, branch.upstream]] : []))
  return {
    steps: [['stash', 'clear'], ...(landing === clone.currentBranch ? [] : [['checkout', '--force', landing]]), ...resets, ['reset', '--hard', landingUpstream], ['clean', '-fd'], ...clone.localOnlyBranches.map(branch => ['branch', '-D', branch])],
  }
}

/**
 * Run git steps one after the other in the clone, and stop at the first that fails
 * @param folder the clone
 * @param steps the steps
 * @returns the failure, undefined when every step worked
 */
async function runSteps(folder: string, steps: readonly Step[]): Promise<string | undefined> {
  const [step, ...rest] = steps
  if (step === undefined) return undefined
  const { ok, stderr } = await run('git', [...step], folder)
  return ok ? runSteps(folder, rest) : `git ${step.join(' ')} failed: ${stderr.trim()}`
}

/**
 * Say what a discard would throw away, read fresh with a fetch: the exact list the dialog shows, with its fingerprint
 * @param options what to discard
 * @returns the list, or the reason the discard is refused
 * @example const preview = await previewDiscard({ gh: ghCli, name: 'jozzo', owner: 'Shuunen', target })
 */
export async function previewDiscard(options: Readonly<ActionOptions>): Promise<DiscardPreview> {
  try {
    const proof = await proveArchived(options, 'discard')
    if (!proof.ok) return proof
    const groups = unsavedGroups(proof.clone)
    return { fingerprint: fingerprintOf(groups), groups, ok: true, path: proof.clone.path }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Throw away the unsaved work of the clone of an archived repo, for good: stashes, uncommitted and untracked files, commits that are not on GitHub, local-only branches. Ignored files stay. It proves everything again first, from scratch with a fresh fetch, and refuses unless the clone holds exactly the work the user saw. Nothing is touched on GitHub
 * @param options what to discard, with the fingerprint of the list the user confirmed
 * @returns the result, refused with the reason when the proof fails
 * @example const result = await discardClone({ fingerprint: preview.fingerprint, gh: ghCli, name: 'jozzo', owner: 'Shuunen', target })
 */
export async function discardClone(options: Readonly<DiscardOptions>): Promise<ActionResult> {
  try {
    const proof = await proveArchived(options, 'discard')
    if (!proof.ok) return proof
    if (fingerprintOf(unsavedGroups(proof.clone)) !== options.fingerprint) return { ok: false, reason: 'the unsaved work of the clone is not what the dialog listed any more, nothing was discarded, open the dialog again' }
    const head = await run('git', ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], proof.clone.path)
    const plan = planSteps(proof.clone, head.ok ? head.stdout.trim().replace(/^origin\//u, '') : undefined)
    if ('reason' in plan) return { ok: false, reason: plan.reason }
    const failure = await runSteps(proof.clone.path, plan.steps)
    if (failure !== undefined) return { ok: false, reason: `${failure}, the discard stopped there and the clone may be half discarded` }
    const after = unsavedGroups(await options.git.readClone(proof.clone.path, { shouldFetch: false }))
    return after.length === 0 ? { message: `discarded the unsaved work of ${proof.clone.path}, it is now identical to GitHub`, ok: true } : { ok: false, reason: `the discard ran but the clone still holds ${after.map(group => group.title.toLowerCase()).join(', ')}` }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}
