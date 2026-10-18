import path from 'node:path'
import type { GithubRepo, LocalClone } from '../../shared/project.ts'
import { readClones } from './git.ts'
import { type GhRunner, getLogin, getRepo, listPullRequests, listRepos, readCi, readLastOwnCommit } from './github.ts'
import { mapLimit } from './map-limit.ts'

/** How many repos are read from GitHub at the same time, one or two calls each */
const parallelRepos = 8

/** Receives a short line about what the scan is doing, for long scans */
export type Progress = (message: string) => void

/**
 * Add the open pull requests to the repos, from one search call. When the search fails (the rate limit of the search is low) the scan goes on without them: the checks that need them do not apply
 * @param gh the gh runner
 * @param repos the repos
 * @param owner the owner login
 * @returns the repos, each with its pull request counts, or untouched when the search failed
 */
async function withPullRequests(gh: GhRunner, repos: readonly GithubRepo[], owner: string) {
  const counts = await listPullRequests(gh, owner).catch(() => undefined)
  return counts === undefined ? [...repos] : repos.map(repo => ({ ...repo, pullRequests: counts.get(repo.slug) ?? { other: 0, renovate: 0 } }))
}

/**
 * Tell if the last commit of the account is worth reading for a repo: it is alive and not a fork, and it is either not cloned or nothing shows it is used, no star and no website. The others are not archive candidates
 * @param repo the repo
 * @param cloned the slugs of the repos that have a clone
 * @returns true when the last commit is read
 */
function needsOwnCommit(repo: Readonly<GithubRepo>, cloned: ReadonlySet<string | undefined>) {
  return !cloned.has(repo.slug) || (repo.stars === 0 && repo.homepage === undefined && repo.hasPages !== true)
}

/**
 * Add the CI status of the default branch and, for the repos that could be archive candidates, the date of the last commit of the account. Archived repos and forks are left alone. A call that fails leaves its field undefined, so the checks that need it do not apply
 * @param gh the gh runner
 * @param repos the repos
 * @param scope what the account has
 * @param scope.clones the local clones
 * @param scope.login the authenticated login
 * @returns the repos with what was read
 */
function withActivity(gh: GhRunner, repos: readonly GithubRepo[], { clones, login }: Readonly<{ clones: readonly LocalClone[]; login: string }>) {
  const cloned = new Set(clones.map(clone => clone.slug))
  return mapLimit(repos, parallelRepos, async (repo): Promise<GithubRepo> => {
    if (repo.isArchived || repo.isFork) return repo
    const [ci, lastOwnCommitAt] = await Promise.all([readCi(gh, repo), needsOwnCommit(repo, cloned) ? readLastOwnCommit(gh, repo, login) : undefined])
    return { ...repo, ci, lastOwnCommitAt }
  })
}

/**
 * Get the owner's repos: only the target's repo in single project mode, every repo in folder mode. Forks are compared with their parent later, per project
 * @param gh the gh runner
 * @param scope what to list
 * @param scope.login the authenticated login
 * @param scope.owner the owner
 * @param scope.onProgress receives progress lines
 * @param scope.single the clone of the single project, undefined in folder mode
 * @param scope.clones the local clones
 * @returns the repos
 */
async function readRepos(gh: GhRunner, { clones, login, onProgress, owner, single }: Readonly<{ clones: readonly LocalClone[]; login: string; onProgress: Progress; owner: string; single: LocalClone | undefined }>) {
  if (single === undefined) {
    onProgress(`listing the repos of ${owner} on GitHub`)
    const repos = await withPullRequests(gh, await listRepos(gh, owner, login), owner)
    onProgress('reading the CI and the activity of the repos')
    return withActivity(gh, repos, { clones, login })
  }
  const repo = single.slug === undefined ? undefined : await getRepo(gh, single.slug)
  return repo === undefined ? [] : [repo]
}

/**
 * Read the inventory of a target: its clones, then the owner's repos, single project mode when the target is itself a repo
 * @param gh the gh runner
 * @param options what to read
 * @param options.onProgress receives progress lines
 * @param options.owner the GitHub owner, detected when undefined
 * @param options.target the folder to read
 * @returns the clones, the repos, the owner, and whether the target is a single project
 * @throws {Error} when gh fails
 */
export async function readInventory(gh: GhRunner, options: Readonly<{ onProgress: Progress; owner: string | undefined; target: string }>) {
  const { onProgress } = options
  const target = path.resolve(options.target)
  onProgress(`reading the local clones in ${target}`)
  const [login, clones] = await Promise.all([getLogin(gh), readClones(target, { shouldFetch: false })])
  const single = clones.length === 1 && clones[0]?.path === target ? clones[0] : undefined
  const owner = options.owner ?? single?.slug?.split('/')[0] ?? login
  const repos = await readRepos(gh, { clones, login, onProgress, owner, single })
  return { clones, isSingle: single !== undefined, owner, repos }
}
