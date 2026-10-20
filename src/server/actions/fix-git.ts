import { fingerprintOf, staleReason } from './fingerprint.ts'
import { type ActionResult, attempt, type GitFixPreview, refused } from '../../shared/action.ts'
import type { GithubRepo, LocalClone } from '../../shared/project.ts'
import { getRepo } from '../inventory/github.ts'
import { type ActionOptions, type GitRunner, realRunGit } from './action-options.ts'
import { checkFolderOfProjects, requireCloneOf } from './guards.ts'

/** What the git fixes would do */
interface GitPlan {
  /** The local branches, not checked out, that are only behind their upstream: moved forward without checkout */
  fastForward: string[]
  /** The local branches to delete: the ones without upstream and the merged ones, all deleted even when git finds work in them that is not merged */
  branches: string[]
  /** The default branch to pull, undefined when there is nothing to pull */
  pull: string | undefined
  /** The stashes to drop */
  stashes: string[]
}

/**
 * Prove the clone is still right to fix, from scratch: a folder of projects, a repo still there and not archived, one usable clone of the owner, read again with a fresh fetch
 * @param options what to fix
 * @param options.gh runs gh
 * @param options.git how the clones are read
 * @param options.name the repo name
 * @param options.owner the GitHub owner
 * @param options.target the folder of projects
 * @returns the repo and the clone, or the reason to refuse
 */
export async function proveClone({ gh, git, name, owner, target }: Readonly<ActionOptions>): Promise<{ clone: LocalClone; repo: GithubRepo } | { reason: string }> {
  const single = await checkFolderOfProjects(target)
  if (single !== undefined) return { reason: single }
  const slug = `${owner}/${name}`
  const repo = await getRepo(gh, slug)
  if (repo === undefined) return { reason: `${slug} does not exist on GitHub any more` }
  if (repo.isArchived) return { reason: `${slug} is archived now, its clone has its own checks` }
  const found = await requireCloneOf({ git, target }, repo.slug, { shouldFetch: true })
  if ('reason' in found) return found
  const { clone } = found
  if (clone.problem !== undefined) return { reason: `the clone of ${repo.slug} cannot be read: ${clone.problem}` }
  return clone.fetchFailed ? { reason: `git fetch failed in the clone of ${repo.slug}, nothing about its remote can be trusted` } : { clone, repo }
}

/**
 * Plan the git fixes: the other branches only behind their upstream moved forward, the local branches without upstream or already merged into the default branch (never the checked out one nor the default one), the stashes, and a pull of the default branch when it is checked out, behind its remote, and has no uncommitted file
 * @param clone the clone
 * @param repo the repo
 * @returns the plan
 */
function planOf(clone: Readonly<LocalClone>, repo: Readonly<GithubRepo>): GitPlan {
  const isPullable = clone.currentBranch === repo.defaultBranch && clone.changedFiles.length === 0 && clone.branches.some(branch => branch.name === clone.currentBranch && branch.behind > 0 && !branch.isGone)
  const merged = clone.branches.filter(branch => branch.isMerged === true && branch.name !== repo.defaultBranch).map(branch => branch.name)
  const branches = [...new Set([...clone.localOnlyBranches, ...merged])].filter(branch => branch !== clone.currentBranch)
  const fastForward = clone.branches.filter(branch => branch.name !== clone.currentBranch && branch.upstream !== undefined && branch.behind > 0 && branch.ahead === 0 && !branch.isGone && !branches.includes(branch.name)).map(branch => branch.name)
  return { branches, fastForward, pull: isPullable ? repo.defaultBranch : undefined, stashes: clone.stashes }
}

/**
 * Say what the git fixes would do, read fresh with a fetch: the branches to delete, the stashes to drop and the pull, with the fingerprint of that plan
 * @param options what to fix
 * @returns the plan, or the reason there is nothing to do
 * @example const preview = await previewFixGit({ gh: ghCli, git: realGit, name: 'app', owner: 'Shuunen', target })
 */
export function previewFixGit(options: Readonly<ActionOptions>): Promise<GitFixPreview> {
  return attempt(async () => {
    const proof = await proveClone(options)
    if ('reason' in proof) return refused(proof.reason)
    const plan = planOf(proof.clone, proof.repo)
    if (plan.branches.length === 0 && plan.fastForward.length === 0 && plan.pull === undefined && plan.stashes.length === 0) return refused('there is no git issue to fix in this clone')
    return { ...plan, fingerprint: fingerprintOf(plan), ok: true, path: proof.clone.path }
  })
}

/**
 * Delete the branches one after the other, git locks its config, forced even when git finds work in them that is not merged: the user confirmed the list
 * @param clone the clone
 * @param branches the branches
 * @param runGit runs git
 * @returns the failures
 */
export async function deleteBranches(clone: Readonly<LocalClone>, branches: readonly string[], runGit: GitRunner): Promise<string[]> {
  const [branch, ...rest] = branches
  if (branch === undefined) return []
  const { ok, stderr } = await runGit(['branch', '-D', '--', branch], clone.path)
  return [...(ok ? [] : [`${branch}: ${stderr.trim()}`]), ...(await deleteBranches(clone, rest, runGit))]
}

/**
 * Move the branches that are not checked out forward to their upstream, git refuses it unless it is a fast forward
 * @param clone the clone
 * @param branches the branches
 * @param runGit runs git
 * @returns the failures
 */
async function fastForwardBranches(clone: Readonly<LocalClone>, branches: readonly string[], runGit: GitRunner): Promise<string[]> {
  const [branch, ...rest] = clone.branches.filter(item => branches.includes(item.name))
  if (branch === undefined) return []
  const upstream = String(branch.upstream)
  const slash = upstream.indexOf('/')
  const { ok, stderr } = await runGit(['fetch', upstream.slice(0, slash), `${upstream.slice(slash + 1)}:${branch.name}`], clone.path)
  return [...(ok ? [] : [`${branch.name}: ${stderr.trim()}`]), ...(await fastForwardBranches({ ...clone, branches: rest }, branches, runGit))]
}

/**
 * Run the plan: pull first, so nothing is deleted when it fails, then move the other branches forward, drop the stashes, then delete the branches
 * @param clone the clone
 * @param plan the plan
 * @param runGit runs git
 * @returns the reason it failed, undefined when everything worked
 */
async function applyPlan(clone: Readonly<LocalClone>, plan: Readonly<GitPlan>, runGit: GitRunner) {
  if (plan.pull !== undefined) {
    const pulled = await runGit(['pull', '--ff-only'], clone.path)
    if (!pulled.ok) return `git pull failed: ${pulled.stderr.trim()}, nothing else was changed`
  }
  const stuck = await fastForwardBranches(clone, plan.fastForward, runGit)
  if (stuck.length > 0) return `these branches could not be moved forward: ${stuck.join(' | ')}, nothing else was changed`
  const cleared = plan.stashes.length > 0 && (await runGit(['stash', 'clear'], clone.path))
  if (cleared !== false && !cleared.ok) return `git stash clear failed: ${cleared.stderr.trim()}`
  const failures = await deleteBranches(clone, plan.branches, runGit)
  return failures.length > 0 ? `these branches could not be deleted: ${failures.join(' | ')}` : undefined
}

/**
 * Apply the git fixes of a clone, after proving everything again from scratch: it is refused unless the plan is exactly the one the user saw. The stashes are dropped, the branches deleted (forced, even the ones that hold unmerged work), then the default branch is pulled fast forward only
 * @param options what to fix, with the fingerprint of the plan the user confirmed
 * @param options.fingerprint the fingerprint of the plan the user confirmed
 * @param options.runGit runs git in a folder, the real git by default
 * @returns the result, refused with the reason when the proof fails
 * @example const result = await fixGit({ fingerprint: preview.fingerprint, gh: ghCli, git: realGit, name: 'app', owner: 'Shuunen', target })
 */
export function fixGit({ fingerprint, runGit = realRunGit, ...options }: Readonly<ActionOptions & { fingerprint: string }>): Promise<ActionResult> {
  return attempt(async () => {
    const proof = await proveClone(options)
    if ('reason' in proof) return refused(proof.reason)
    const { clone, repo } = proof
    const plan = planOf(clone, repo)
    if (fingerprintOf(plan) !== fingerprint) return refused(staleReason('the git issues of the clone are', 'changed'))
    const failure = await applyPlan(clone, plan, runGit)
    if (failure !== undefined) return refused(failure)
    return { message: `fixed the git issues of ${clone.path}`, ok: true }
  })
}
