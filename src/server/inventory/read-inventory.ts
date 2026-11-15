import path from 'node:path'
import type { GithubRepo, LocalClone } from '../../shared/project.ts'
import { readClones } from './git.ts'
import { countBranchPullRequests, type GhRunner, getLogin, getRepo, listPullRequests, listRepos, readCi, readLastOwnCommit, readSettings } from './github.ts'
import { mapLimit } from './map-limit.ts'

/** How many repos are read from GitHub at the same time, one or two calls each */
const parallelRepos = 8

/** Receives a short line about what the scan is doing, for long scans */
export type Progress = (message: string) => void

/**
 * Add the open pull requests to the repos, from one search call, and for the repos whose clone has another branch than the default one checked out, how many come from that active branch. When the search fails (the rate limit of the search is low) the scan goes on without them: the checks that need them do not apply
 * @param gh the gh runner
 * @param repos the repos
 * @param scope what the account has
 * @param scope.clones the local clones
 * @param scope.owner the owner login
 * @returns the repos, each with its pull request counts, or untouched when the search failed
 */
async function withPullRequests(gh: GhRunner, repos: readonly GithubRepo[], { clones, owner }: Readonly<{ clones: readonly LocalClone[]; owner: string }>) {
  const counts = await listPullRequests(gh, owner).catch(() => undefined)
  if (counts === undefined) return [...repos]
  return mapLimit(repos, parallelRepos, async (repo): Promise<GithubRepo> => {
    const pullRequests = counts.get(repo.slug) ?? { other: 0, renovate: 0 }
    const branch = clones.find(clone => clone.slug === repo.slug)?.currentBranch
    if (branch === undefined || branch === '' || branch === repo.defaultBranch || pullRequests.other + pullRequests.renovate === 0) return { ...repo, pullRequests }
    return { ...repo, pullRequests: { ...pullRequests, onActiveBranch: await countBranchPullRequests(gh, repo, branch) } }
  })
}

/**
 * Add the CI status of the default branch, the settings of the repo and the date of the last commit of the account, for each live repo. Archived repos and forks are left alone. A call that fails leaves its field undefined, so the checks that need it do not apply
 * @param gh the gh runner
 * @param repos the repos
 * @param login the authenticated login
 * @returns the repos with what was read
 */
function withActivity(gh: GhRunner, repos: readonly GithubRepo[], login: string) {
  return mapLimit(repos, parallelRepos, async (repo): Promise<GithubRepo> => {
    if (repo.isArchived || repo.isFork) return repo
    const [ci, lastOwnCommitAt, settings] = await Promise.all([readCi(gh, repo), readLastOwnCommit(gh, repo, login), readSettings(gh, repo)])
    return { ...repo, ci, lastOwnCommitAt, ...(settings !== undefined && { settings }) }
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
    const repos = await withPullRequests(gh, await listRepos(gh, owner, login), { clones, owner })
    onProgress('reading the CI and the activity of the repos')
    return withActivity(gh, repos, login)
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
 * @returns the clones, the repos, the owner (undefined when GitHub could not be read and none was given), whether the target is a single project, and whether GitHub was read. Without a working gh there is no repo and no GitHub-based check, the local ones still run
 */
export async function readInventory(gh: GhRunner, options: Readonly<{ onProgress: Progress; owner: string | undefined; target: string }>) {
  const { onProgress } = options
  const target = path.resolve(options.target)
  onProgress(`reading the local clones in ${target}`)
  const [login, clones] = await Promise.all([getLogin(gh).catch(() => undefined), readClones(target, { shouldFetch: false })])
  const single = clones.length === 1 && clones[0]?.path === target ? clones[0] : undefined
  if (login === undefined) {
    onProgress('gh is missing or not logged in, the checks that need GitHub are skipped')
    return { clones, isOffline: true, isSingle: single !== undefined, owner: options.owner ?? single?.slug?.split('/')[0], repos: [] }
  }
  const owner = options.owner ?? single?.slug?.split('/')[0] ?? login
  const repos = await readRepos(gh, { clones, login, onProgress, owner, single })
  return { clones, isOffline: false, isSingle: single !== undefined, owner, repos }
}
