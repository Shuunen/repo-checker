import type { GithubRepo } from '../../shared/project.ts'
import { run, type ShellResult } from './shell.ts'

/** Runs `gh` with the given arguments, replaced by a fake in tests */
export type GhRunner = (args: readonly string[]) => Promise<ShellResult>

/**
 * The real `gh` CLI, it holds the token, the tool never sees it
 * @param args the gh arguments
 * @returns the outcome
 */
export const ghCli: GhRunner = args => run('gh', args)

/** The fields of a repo in the GitHub REST API that the scan reads */
interface ApiRepo {
  archived: boolean
  default_branch: string
  description?: string | null
  homepage?: string | null
  license?: object | null
  topics?: string[]
  fork: boolean
  name: string
  owner: { login: string }
  private: boolean
  pushed_at: string
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
 * Keep what the scan needs from an API repo
 * @param repo the API repo
 * @returns the repo
 */
function toRepo(repo: Readonly<ApiRepo>): GithubRepo {
  return {
    defaultBranch: repo.default_branch,
    description: repo.description || undefined,
    forkStatus: undefined,
    hasLicense: Boolean(repo.license),
    homepage: repo.homepage || undefined,
    isArchived: repo.archived,
    isFork: repo.fork,
    isPrivate: repo.private,
    name: repo.name,
    owner: repo.owner.login,
    pushedAt: repo.pushed_at,
    slug: `${repo.owner.login}/${repo.name}`.toLowerCase(),
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
