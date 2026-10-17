import path from 'node:path'
import type { GithubRepo, LocalClone } from '../../shared/project.ts'
import { readClones } from './git.ts'
import { type GhRunner, getLogin, getRepo, listPullRequests, listRepos } from './github.ts'

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
 * Get the owner's repos: only the target's repo in single project mode, every repo in folder mode. Forks are compared with their parent later, per project
 * @param gh the gh runner
 * @param scope what to list
 * @param scope.login the authenticated login
 * @param scope.owner the owner
 * @param scope.onProgress receives progress lines
 * @param scope.single the clone of the single project, undefined in folder mode
 * @returns the repos
 */
async function readRepos(gh: GhRunner, { login, onProgress, owner, single }: Readonly<{ login: string; onProgress: Progress; owner: string; single: LocalClone | undefined }>) {
  if (single === undefined) {
    onProgress(`listing the repos of ${owner} on GitHub`)
    return withPullRequests(gh, await listRepos(gh, owner, login), owner)
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
  const repos = await readRepos(gh, { login, onProgress, owner, single })
  return { clones, isSingle: single !== undefined, owner, repos }
}
