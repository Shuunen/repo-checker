import { sum } from 'es-toolkit'
import type { ForkStatus, GithubRepo } from '../../shared/project.ts'
import type { GhRunner } from './github.ts'
import { mapLimit } from './map-limit.ts'

/** How many forks are compared at the same time, each one runs a few calls per branch */
const parallelForks = 4

/** The outcome of one `gh api` call that may fail without stopping the scan */
type Attempt<Value> = { failure: string; value: undefined } | { failure: undefined; value: Value }

/** The parent fields of a fork in the GitHub REST API */
interface ApiParent {
  default_branch: string
  full_name: string
}

/** What the comparison of one branch gives */
interface BranchCheck {
  /** The branch and how far ahead of the parent it is, undefined when the comparison failed */
  branch: ForkStatus['branches'][number] | undefined
  /** The calls that failed */
  failures: string[]
  /** Open pull requests from the branch */
  openPullRequests: number
}

/**
 * Run `gh api` and keep the failure instead of throwing, so one failed call marks the fork as not verifiable
 * @param gh the gh runner
 * @param args the arguments after `api`
 * @returns the parsed output, or the failure with the endpoint and the gh error
 */
async function tryApi<Value>(gh: GhRunner, args: readonly string[]): Promise<Attempt<Value>> {
  const { ok, stderr, stdout } = await gh(['api', ...args])
  if (ok) return { failure: undefined, value: JSON.parse(stdout) as Value }
  return { failure: `${args.at(-1)}: ${stderr.trim()}`, value: undefined }
}

/**
 * Compare one branch of a fork with the parent's default branch, and count its open pull requests
 * @param gh the gh runner
 * @param target what to compare
 * @param target.branch the fork branch name
 * @param target.owner the fork owner login
 * @param target.parent the parent repo
 * @returns the comparison
 */
async function checkBranch(gh: GhRunner, { branch, owner, parent }: Readonly<{ branch: string; owner: string; parent: ApiParent }>): Promise<BranchCheck> {
  const head = `${owner}:${branch}`
  const [compare, pulls] = await Promise.all([
    tryApi<{ ahead_by: number }>(gh, [`repos/${parent.full_name}/compare/${encodeURIComponent(parent.default_branch)}...${owner}:${encodeURIComponent(branch)}`]),
    tryApi<unknown[]>(gh, [`repos/${parent.full_name}/pulls?state=open&per_page=100&head=${encodeURIComponent(head)}`]),
  ])
  const failures = [compare.failure, pulls.failure].filter(failure => failure !== undefined)
  return { branch: compare.value && { aheadBy: compare.value.ahead_by, name: branch }, failures, openPullRequests: pulls.value?.length ?? 0 }
}

/**
 * Read how a fork compares with its parent: every branch against the parent's default branch, and the open pull requests
 * @param gh the gh runner
 * @param repo the fork
 * @returns the fork status, with every failed call in `failures`
 * @example const status = await readForkStatus(ghCli, fork)
 */
export async function readForkStatus(gh: GhRunner, repo: Readonly<GithubRepo>): Promise<ForkStatus> {
  const details = await tryApi<{ parent?: ApiParent }>(gh, [`repos/${repo.owner}/${repo.name}`])
  const parent = details.value?.parent
  if (parent === undefined) return { branches: [], failures: [details.failure ?? `repos/${repo.owner}/${repo.name}: no parent repo`], openPullRequests: 0, parent: '' }
  const branchPages = await tryApi<{ name: string }[][]>(gh, ['--paginate', '--slurp', `repos/${repo.owner}/${repo.name}/branches?per_page=100`])
  if (branchPages.value === undefined) return { branches: [], failures: [branchPages.failure], openPullRequests: 0, parent: parent.full_name }
  const checks = await Promise.all(branchPages.value.flat().map(branch => checkBranch(gh, { branch: branch.name, owner: repo.owner, parent })))
  const branches = checks.flatMap(check => (check.branch === undefined ? [] : [check.branch]))
  return { branches, failures: checks.flatMap(check => check.failures), openPullRequests: sum(checks.map(check => check.openPullRequests)), parent: parent.full_name }
}

/**
 * Read the fork status of every fork, a few forks at a time. Other repos are returned as they are
 * @param gh the gh runner
 * @param repos the repos
 * @returns the repos, forks with their `forkStatus`
 * @example const repos = await addForkStatus(ghCli, await listRepos(ghCli, owner, login))
 */
export function addForkStatus(gh: GhRunner, repos: readonly GithubRepo[]) {
  return mapLimit(repos, parallelForks, async repo => (repo.isFork ? { ...repo, forkStatus: await readForkStatus(gh, repo) } : repo))
}
