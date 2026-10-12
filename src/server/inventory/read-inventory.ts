import path from 'node:path'
import type { GithubRepo, LocalClone } from '../../shared/project.ts'
import { plural } from '../../shared/text.ts'
import { addForkStatus } from './forks.ts'
import { readClones } from './git.ts'
import { type GhRunner, getLogin, getRepo, listRepos } from './github.ts'

/** Receives a short line about what the scan is doing, for long scans */
export type Progress = (message: string) => void

/**
 * Read the fork status of the forks among the repos, saying how many forks are compared
 * @param gh the gh runner
 * @param repos the repos
 * @param onProgress receives progress lines
 * @returns the repos, forks with their status
 */
function withForks(gh: GhRunner, repos: readonly GithubRepo[], onProgress: Progress) {
  const forks = repos.filter(repo => repo.isFork).length
  if (forks > 0) onProgress(`comparing ${plural(forks, 'fork')} with their parent`)
  return addForkStatus(gh, repos)
}

/**
 * Get the owner's repos: only the target's repo in single project mode, every repo in folder mode, forks with their status
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
    return withForks(gh, await listRepos(gh, owner, login), onProgress)
  }
  const repo = single.slug === undefined ? undefined : await getRepo(gh, single.slug)
  return withForks(gh, repo === undefined ? [] : [repo], onProgress)
}

/**
 * Read the inventory of a target: its clones, then the owner's repos, single project mode when the target is itself a repo
 * @param gh the gh runner
 * @param options what to read
 * @param options.onProgress receives progress lines
 * @param options.owner the GitHub owner, detected when undefined
 * @param options.shouldFetch run `git fetch --prune` in each clone first
 * @param options.target the folder to read
 * @returns the clones, the repos, the owner, and whether the target is a single project
 * @throws {Error} when gh fails
 */
export async function readInventory(gh: GhRunner, options: Readonly<{ onProgress: Progress; owner: string | undefined; shouldFetch: boolean; target: string }>) {
  const { onProgress, shouldFetch } = options
  const target = path.resolve(options.target)
  onProgress(`reading the local clones in ${target}${shouldFetch ? ', with git fetch' : ''}`)
  const [login, clones] = await Promise.all([getLogin(gh), readClones(target, { shouldFetch })])
  const single = clones.length === 1 && clones[0]?.path === target ? clones[0] : undefined
  const owner = options.owner ?? single?.slug?.split('/')[0] ?? login
  const repos = await readRepos(gh, { login, onProgress, owner, single })
  return { clones, isSingle: single !== undefined, owner, repos }
}
