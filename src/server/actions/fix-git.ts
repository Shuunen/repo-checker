import { createHash } from 'node:crypto'
import type { ActionResult, GitFixPreview } from '../../shared/action.ts'
import type { GithubRepo, LocalClone } from '../../shared/project.ts'
import { getRepo } from '../inventory/github.ts'
import { run, type ShellResult } from '../inventory/shell.ts'
import type { ActionOptions } from './action-options.ts'
import { checkFolderOfProjects, isRepoName } from './guards.ts'

/** What the git fixes need */
interface FixGitOptions extends ActionOptions {
  /** Runs git in the given folder, the real git by default */
  runGit?: (args: readonly string[], cwd: string) => Promise<ShellResult>
}

/** What the git fixes would do */
interface GitPlan {
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
async function proveClone({ gh, git, name, owner, target }: Readonly<ActionOptions>): Promise<{ clone: LocalClone; repo: GithubRepo } | { reason: string }> {
  if (!isRepoName(name)) return { reason: `${name} is not a repo name` }
  const single = await checkFolderOfProjects(target)
  if (single !== undefined) return { reason: single }
  const slug = `${owner}/${name}`
  const repo = await getRepo(gh, slug)
  if (repo === undefined) return { reason: `${slug} does not exist on GitHub any more` }
  if (repo.isArchived) return { reason: `${slug} is archived now, its clone has its own checks` }
  const listed = await git.readClones(target, { shouldFetch: false })
  const matches = listed.filter(clone => clone.slug === repo.slug)
  const [found] = matches
  if (found === undefined || matches.length > 1) return { reason: `expected one clone of ${repo.slug} in ${target}, found ${matches.length}` }
  const clone = await git.readClone(found.path, { shouldFetch: true })
  if (clone.problem !== undefined) return { reason: `the clone of ${repo.slug} cannot be read: ${clone.problem}` }
  return clone.fetchFailed ? { reason: `git fetch failed in the clone of ${repo.slug}, nothing about its remote can be trusted` } : { clone, repo }
}

/**
 * Plan the git fixes: the local branches without upstream or already merged into the default branch (never the checked out one nor the default one), the stashes, and a pull of the default branch when it is checked out, behind its remote, and has no uncommitted file
 * @param clone the clone
 * @param repo the repo
 * @returns the plan
 */
function planOf(clone: Readonly<LocalClone>, repo: Readonly<GithubRepo>): GitPlan {
  const isPullable = clone.currentBranch === repo.defaultBranch && clone.changedFiles.length === 0 && clone.branches.some(branch => branch.name === clone.currentBranch && branch.behind > 0 && !branch.isGone)
  const merged = clone.branches.filter(branch => branch.isMerged === true && branch.name !== repo.defaultBranch).map(branch => branch.name)
  const branches = [...new Set([...clone.localOnlyBranches, ...merged])].filter(branch => branch !== clone.currentBranch)
  return { branches, pull: isPullable ? repo.defaultBranch : undefined, stashes: clone.stashes }
}

/**
 * Fingerprint a plan, so the fix can be refused when it is not the one the user saw
 * @param plan the plan
 * @returns a hash of the plan
 */
function fingerprintOf(plan: Readonly<GitPlan>) {
  return createHash('sha256').update(JSON.stringify(plan)).digest('hex')
}

/**
 * Say what the git fixes would do, read fresh with a fetch: the branches to delete, the stashes to drop and the pull, with the fingerprint of that plan
 * @param options what to fix
 * @returns the plan, or the reason there is nothing to do
 * @example const preview = await previewFixGit({ gh: ghCli, git: realGit, name: 'app', owner: 'Shuunen', target })
 */
export async function previewFixGit(options: Readonly<ActionOptions>): Promise<GitFixPreview> {
  try {
    const proof = await proveClone(options)
    if ('reason' in proof) return { ok: false, reason: proof.reason }
    const plan = planOf(proof.clone, proof.repo)
    if (plan.branches.length === 0 && plan.pull === undefined && plan.stashes.length === 0) return { ok: false, reason: 'there is no git issue to fix in this clone' }
    return { ...plan, fingerprint: fingerprintOf(plan), ok: true, path: proof.clone.path }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Delete one local branch, forced even when git finds work in it that is not merged: the user confirmed the list
 * @param clone the clone
 * @param branch the branch
 * @param runGit runs git
 * @returns the failure, undefined when it worked
 */
async function deleteBranch(clone: Readonly<LocalClone>, branch: string, runGit: NonNullable<FixGitOptions['runGit']>) {
  const { ok, stderr } = await runGit(['branch', '-D', '--', branch], clone.path)
  return ok ? undefined : `${branch}: ${stderr.trim()}`
}

/**
 * Delete the branches one after the other, git locks its config
 * @param clone the clone
 * @param branches the branches
 * @param runGit runs git
 * @returns the failures
 */
async function deleteBranches(clone: Readonly<LocalClone>, branches: readonly string[], runGit: NonNullable<FixGitOptions['runGit']>): Promise<string[]> {
  const [branch, ...rest] = branches
  if (branch === undefined) return []
  const failure = await deleteBranch(clone, branch, runGit)
  return [...(failure === undefined ? [] : [failure]), ...(await deleteBranches(clone, rest, runGit))]
}

/**
 * Run the plan: pull first, so nothing is deleted when it fails, then drop the stashes, then delete the branches
 * @param clone the clone
 * @param plan the plan
 * @param runGit runs git
 * @returns the reason it failed, undefined when everything worked
 */
async function applyPlan(clone: Readonly<LocalClone>, plan: Readonly<GitPlan>, runGit: NonNullable<FixGitOptions['runGit']>) {
  if (plan.pull !== undefined) {
    const pulled = await runGit(['pull', '--ff-only'], clone.path)
    if (!pulled.ok) return `git pull failed: ${pulled.stderr.trim()}, nothing else was changed`
  }
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
export async function fixGit({ fingerprint, runGit = (args, cwd) => run('git', args, cwd), ...options }: Readonly<FixGitOptions & { fingerprint: string }>): Promise<ActionResult> {
  try {
    const proof = await proveClone(options)
    if ('reason' in proof) return { ok: false, reason: proof.reason }
    const { clone, repo } = proof
    const plan = planOf(clone, repo)
    if (fingerprintOf(plan) !== fingerprint) return { ok: false, reason: 'the git issues of the clone are not what the dialog listed any more, nothing was changed, open the dialog again' }
    const failure = await applyPlan(clone, plan, runGit)
    if (failure !== undefined) return { ok: false, reason: failure }
    return { message: `fixed the git issues of ${clone.path}`, ok: true }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}
