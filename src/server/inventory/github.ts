import { Result } from 'shuutils'
import type { CiStatus, GithubRepo, RepoSettings } from '../../shared/project.ts'
import { run, type ShellResult } from './shell.ts'

/** Runs `gh` with the given arguments, replaced by a fake in tests */
export type GhRunner = (args: readonly string[]) => Promise<ShellResult>

/**
 * The real `gh` CLI, it holds the token, the tool never sees it
 * @param args the gh arguments
 * @returns the outcome
 */
export const ghCli: GhRunner = args => run('gh', args)

/** One protection of `security_and_analysis`, `enabled` or `disabled` */
interface ApiStatus {
  status?: string
}

/** The fields of a repo in the GitHub REST API that the scan reads */
interface ApiRepo {
  allow_merge_commit?: boolean | null
  allow_rebase_merge?: boolean | null
  allow_squash_merge?: boolean | null
  archived: boolean
  default_branch: string
  delete_branch_on_merge?: boolean | null
  description?: string | null
  has_pages: boolean
  homepage?: string | null
  license?: object | null
  open_issues_count: number
  topics?: string[]
  fork: boolean
  name: string
  owner: { login: string }
  private: boolean
  pushed_at: string
  security_and_analysis?: { secret_scanning?: ApiStatus; secret_scanning_push_protection?: ApiStatus } | null
  stargazers_count: number
}

/**
 * Run `gh api` and parse its JSON output
 * @param gh the gh runner
 * @param args the arguments after `api`
 * @returns the parsed output
 * @throws {Error} when gh fails, with its error output, for example when it is not installed or not logged in
 */
async function ghApi(gh: GhRunner, args: readonly string[]) {
  const { ok, stderr, stdout } = await gh(['api', ...args])
  if (!ok) throw new Error(`gh api ${args.join(' ')} failed: ${stderr.trim()}`)
  return JSON.parse(stdout) as unknown
}

/**
 * Get the login of the account `gh` is authenticated with
 * @param gh the gh runner
 * @returns the login
 * @throws {Error} when gh fails
 */
export async function getLogin(gh: GhRunner) {
  const user = (await ghApi(gh, ['user'])) as { login: string }
  return user.login
}

/**
 * Read the login once and keep it, a failure is not kept so the next call asks again
 * @param gh the gh runner
 * @returns a function giving the login
 * @example const login = await createLoginReader(gh)()
 */
export function createLoginReader(gh: GhRunner) {
  let kept: Promise<string> | undefined = undefined
  return () => {
    kept ??= (async () => {
      const login = await Result.trySafe(getLogin(gh))
      if (!login.ok) {
        kept = undefined
        throw login.error
      }
      return login.value
    })()
    return kept
  }
}

/**
 * Tell if a protection of the repo is on
 * @param status what GitHub says of it
 * @returns true when enabled, false when disabled, undefined when GitHub did not say
 */
function isEnabled(status: Readonly<ApiStatus> | undefined) {
  return status?.status === undefined ? undefined : status.status === 'enabled'
}

/**
 * Keep the settings of an API repo, the list of repos shows none of them, and a repo the account does not administer neither
 * @param repo the API repo
 * @returns the settings, undefined when GitHub did not show them
 */
function settingsOf(repo: Readonly<ApiRepo>): RepoSettings | undefined {
  if (typeof repo.delete_branch_on_merge !== 'boolean') return undefined
  return {
    allowMergeCommit: repo.allow_merge_commit === true,
    allowRebaseMerge: repo.allow_rebase_merge === true,
    allowSquashMerge: repo.allow_squash_merge === true,
    deleteBranchOnMerge: repo.delete_branch_on_merge,
    hasPushProtection: isEnabled(repo.security_and_analysis?.secret_scanning_push_protection),
    hasSecretScanning: isEnabled(repo.security_and_analysis?.secret_scanning),
  }
}

/**
 * Keep what the scan needs from an API repo
 * @param repo the API repo
 * @returns the repo
 */
function toRepo(repo: Readonly<ApiRepo>): GithubRepo {
  const settings = settingsOf(repo)
  return {
    defaultBranch: repo.default_branch,
    description: repo.description || undefined,
    forkStatus: undefined,
    hasLicense: Boolean(repo.license),
    hasPages: repo.has_pages,
    homepage: repo.homepage || undefined,
    isArchived: repo.archived,
    isFork: repo.fork,
    isPrivate: repo.private,
    name: repo.name,
    openItems: repo.open_issues_count,
    owner: repo.owner.login,
    pullRequests: undefined,
    pushedAt: repo.pushed_at,
    ...(settings !== undefined && { settings }),
    slug: `${repo.owner.login}/${repo.name}`.toLowerCase(),
    stars: repo.stargazers_count,
    topics: repo.topics ?? [],
  }
}

/**
 * List every repo of an owner, private ones included when the owner is the authenticated account
 * @param gh the gh runner
 * @param owner the owner login
 * @param login the authenticated login
 * @returns the repos the owner owns, forks included
 * @throws {Error} when gh fails
 * @example const repos = await listRepos(ghCli, 'Shuunen', await getLogin(ghCli))
 */
export async function listRepos(gh: GhRunner, owner: string, login: string) {
  const endpoint = owner.toLowerCase() === login.toLowerCase() ? 'user/repos?affiliation=owner&per_page=100' : `users/${owner}/repos?per_page=100`
  const pages = (await ghApi(gh, ['--paginate', '--slurp', endpoint])) as ApiRepo[][]
  return pages.flat().map(repo => toRepo(repo))
}

/**
 * Get one repo, for single project mode
 * @param gh the gh runner
 * @param slug `owner/name`
 * @returns the repo, undefined when GitHub answers 404
 * @throws {Error} when gh fails for another reason
 * @example const repo = await getRepo(ghCli, 'shuunen/repo-checker')
 */
export async function getRepo(gh: GhRunner, slug: string) {
  const { ok, stderr, stdout } = await gh(['api', `repos/${slug}`])
  if (ok) return toRepo(JSON.parse(stdout) as ApiRepo)
  if (stderr.includes('HTTP 404')) return undefined
  throw new Error(`gh api repos/${slug} failed: ${stderr.trim()}`)
}

/**
 * Get how many calls GitHub still allows this hour. Asking for the rate limit is free, it does not count against it
 * @param gh the gh runner
 * @returns the remaining calls, undefined when GitHub could not say
 * @example const remaining = await getRemainingCalls(ghCli)
 */
export async function getRemainingCalls(gh: GhRunner) {
  const { ok, stdout } = await gh(['api', 'rate_limit', '--jq', '.resources.core.remaining'])
  const remaining = Math.trunc(Number(stdout))
  return ok && Number.isFinite(remaining) ? remaining : undefined
}

/** The fields of a result of the search API that the pull request counts read */
interface ApiSearchItem {
  html_url: string
  repository_url: string
  user: { login: string }
}

/**
 * Tell if a pull request was opened by Renovate
 * @param item the search result
 * @returns true for `renovate[bot]`, or a self-hosted Renovate account
 */
function isRenovate(item: Readonly<ApiSearchItem>) {
  return item.user.login.startsWith('renovate')
}

/**
 * Count the open pull requests of an owner per repo, with one search call for the whole account, Renovate's apart from the others
 * @param gh the gh runner
 * @param owner the owner login
 * @returns the counts by `owner/name` in lowercase, a repo without open pull request is not in it
 * @throws {Error} when gh fails, for example on the rate limit of the search
 * @example const counts = await listPullRequests(ghCli, 'Shuunen')
 */
export async function listPullRequests(gh: GhRunner, owner: string) {
  const pages = (await ghApi(gh, ['--paginate', '--slurp', `search/issues?q=user:${owner}+is:pr+is:open&per_page=100`])) as { items: ApiSearchItem[] }[]
  const perRepo = Map.groupBy(
    pages.flatMap(page => page.items),
    item => item.repository_url.replace('https://api.github.com/repos/', '').toLowerCase(),
  )
  return new Map([...perRepo].map(([slug, items]) => [slug, { other: items.filter(item => !isRenovate(item)).length, renovate: items.filter(item => isRenovate(item)).length, ...(items.length === 1 ? { onlyUrl: items[0]?.html_url } : {}) }]))
}

/**
 * Count the open pull requests whose head is a branch of the repo, like the checked out branch of a clone. A failed call counts none, the pull requests are then all counted
 * @param gh the gh runner
 * @param repo the repo
 * @param branch the branch name
 * @returns the number of open pull requests coming from this branch
 * @example const count = await countBranchPullRequests(ghCli, repo, 'feat/login')
 */
export async function countBranchPullRequests(gh: GhRunner, repo: Readonly<Pick<GithubRepo, 'owner' | 'slug'>>, branch: string) {
  const { ok, stdout } = await gh(['api', `repos/${repo.slug}/pulls?state=open&per_page=100&head=${encodeURIComponent(`${repo.owner}:${branch}`)}`])
  return ok ? (JSON.parse(stdout) as unknown[]).length : 0
}

/**
 * Read the settings of a repo, which the list of repos does not show: one call. A call that fails, or a repo the account does not administer, leaves them undefined, so the checks that need them do not apply
 * @param gh the gh runner
 * @param repo the repo
 * @param repo.slug `owner/name`
 * @returns the settings, undefined when GitHub could not say
 * @example const settings = await readSettings(ghCli, repo) // { deleteBranchOnMerge: true, ... }
 */
export async function readSettings(gh: GhRunner, { slug }: Readonly<Pick<GithubRepo, 'slug'>>) {
  const repo = await getRepo(gh, slug).catch(() => undefined)
  return repo?.settings
}

/** The conclusions of a finished workflow run that mean the CI is red */
const failedConclusions = new Set(['failure', 'startup_failure', 'timed_out'])

/**
 * Read the CI status of the default branch: how the last finished workflow run ended
 * @param gh the gh runner
 * @param repo the repo
 * @param repo.defaultBranch the default branch
 * @param repo.name the repo name
 * @param repo.owner the owner login
 * @returns the status, undefined when GitHub could not say, for example on a repo with the actions off
 * @example const ci = await readCi(ghCli, repo) // 'failing'
 */
export async function readCi(gh: GhRunner, { defaultBranch, name, owner }: Readonly<Pick<GithubRepo, 'defaultBranch' | 'name' | 'owner'>>): Promise<CiStatus | undefined> {
  const { ok, stdout } = await gh(['api', `repos/${owner}/${name}/actions/runs?branch=${encodeURIComponent(defaultBranch)}&status=completed&exclude_pull_requests=true&per_page=1`])
  const runs = (ok ? (JSON.parse(stdout) as { workflow_runs?: { conclusion: string | null }[] }) : undefined)?.workflow_runs
  if (!Array.isArray(runs)) return undefined
  const [latest] = runs
  if (latest === undefined) return 'none'
  return failedConclusions.has(String(latest.conclusion)) ? 'failing' : 'passing'
}

/**
 * Read when the account last committed to a repo, the commits of bots like Renovate are not its own
 * @param gh the gh runner
 * @param repo the repo
 * @param repo.name the repo name
 * @param repo.owner the owner login
 * @param login the login of the account
 * @returns the date of the last commit, `never` when the account never committed, undefined when GitHub could not say, for example on an empty repo
 * @example const date = await readLastOwnCommit(ghCli, repo, 'Shuunen') // '2024-03-02T10:00:00Z'
 */
export async function readLastOwnCommit(gh: GhRunner, { name, owner }: Readonly<Pick<GithubRepo, 'name' | 'owner'>>, login: string): Promise<string | undefined> {
  const { ok, stdout } = await gh(['api', `repos/${owner}/${name}/commits?author=${login}&per_page=1`])
  const commits = ok ? (JSON.parse(stdout) as unknown) : undefined
  if (!Array.isArray(commits)) return undefined
  const [commit] = commits as { commit: { committer: { date: string } } }[]
  return commit?.commit.committer.date ?? 'never'
}
