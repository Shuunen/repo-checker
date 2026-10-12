import path from 'node:path'
import type { LocalClone } from '../../shared/project.ts'
import { addForkStatus } from './forks.ts'
import { readClones } from './git.ts'
import { type GhRunner, getLogin, getRepo, listRepos } from './github.ts'

/**
 * Get the owner's repos: only the target's repo in single project mode, every repo in folder mode, forks with their status
 * @param gh the gh runner
 * @param scope what to list
 * @param scope.login the authenticated login
 * @param scope.owner the owner
 * @param scope.single the clone of the single project, undefined in folder mode
 * @returns the repos
 */
async function readRepos(gh: GhRunner, { login, owner, single }: Readonly<{ login: string; owner: string; single: LocalClone | undefined }>) {
  if (single === undefined) return addForkStatus(gh, await listRepos(gh, owner, login))
  const repo = single.slug === undefined ? undefined : await getRepo(gh, single.slug)
  return addForkStatus(gh, repo === undefined ? [] : [repo])
}

/**
 * Read the inventory of a target: its clones, then the owner's repos, single project mode when the target is itself a repo
 * @param gh the gh runner
 * @param options what to read
 * @param options.owner the GitHub owner, detected when undefined
 * @param options.shouldFetch run `git fetch --prune` in each clone first
 * @param options.target the folder to read
 * @returns the clones, the repos, the owner, and whether the target is a single project
 * @throws {Error} when gh fails
 */
export async function readInventory(gh: GhRunner, options: Readonly<{ owner: string | undefined; shouldFetch: boolean; target: string }>) {
  const target = path.resolve(options.target)
  const [login, clones] = await Promise.all([getLogin(gh), readClones(target, { shouldFetch: options.shouldFetch })])
  const single = clones.length === 1 && clones[0]?.path === target ? clones[0] : undefined
  const owner = options.owner ?? single?.slug?.split('/')[0] ?? login
  const repos = await readRepos(gh, { login, owner, single })
  return { clones, isSingle: single !== undefined, owner, repos }
}
