import path from 'node:path'
import type { ActionResult } from '../../shared/action.ts'
import { type GhRunner, getRepo } from '../inventory/github.ts'
import { checkFolderOfProjects, exists, isRepoName } from './guards.ts'

/** What a clone needs */
interface CloneOptions {
  /** Runs gh */
  gh: GhRunner
  /** The repo name, as asked by the page */
  name: string
  /** The GitHub owner the scan compares with */
  owner: string
  /** The folder of projects the clone goes in */
  target: string
}

/**
 * Prove nothing is in the way: a folder of projects, no folder of that name yet
 * @param target the folder of projects
 * @param folder the folder the clone would create
 * @returns the reason to refuse, undefined when the way is free
 */
async function checkFolders(target: string, folder: string) {
  const reason = await checkFolderOfProjects(target)
  if (reason !== undefined) return reason
  if (await exists(folder)) return `a folder named ${path.basename(folder)} already exists in ${target}`
  return undefined
}

/**
 * Prove the repo is still one the scan offers to clone: on GitHub, under the owner, not archived, not a fork
 * @param gh runs gh
 * @param slug `owner/name`
 * @returns the reason to refuse, undefined when the repo is still cloneable
 * @throws {Error} when gh fails for a reason other than a 404
 */
async function checkRepo(gh: GhRunner, slug: string) {
  const repo = await getRepo(gh, slug)
  if (repo === undefined) return `${slug} does not exist on GitHub any more`
  if (repo.slug !== slug.toLowerCase()) return `${slug} was renamed or moved to ${repo.slug}, scan again`
  if (repo.isArchived) return `${slug} is archived now, it is not offered for cloning`
  return repo.isFork ? `${slug} is a fork, it is not offered for cloning` : undefined
}

/**
 * Prove the clone is still right, name first, then the folders, then GitHub
 * @param options what to clone and where
 * @param options.gh runs gh
 * @param options.name the repo name
 * @param options.owner the GitHub owner
 * @param options.target the folder of projects
 * @returns the reason to refuse, undefined when everything holds
 * @throws {Error} when gh fails for a reason other than a 404
 */
async function refusal({ gh, name, owner, target }: Readonly<CloneOptions>) {
  if (!isRepoName(name)) return `${name} is not a repo name`
  return (await checkFolders(target, path.join(target, name))) ?? (await checkRepo(gh, `${owner}/${name}`))
}

/**
 * Clone a repo of the owner into the folder of projects, after proving again that the scan was right: the repo is still on GitHub, not archived, not a fork, and no folder is in the way. The clone is made by `gh repo clone`, so it uses the protocol chosen in the gh config and the tool never sees a token
 * @param options what to clone and where
 * @param options.gh runs gh
 * @param options.name the repo name
 * @param options.owner the GitHub owner
 * @param options.target the folder of projects
 * @returns the result, refused with the reason when the proof fails
 * @example const result = await cloneRepo({ gh: ghCli, name: 'finga', owner: 'Shuunen', target: '/home/me/projects' })
 */
export async function cloneRepo(options: Readonly<CloneOptions>): Promise<ActionResult> {
  const { gh, name, owner, target } = options
  try {
    const reason = await refusal(options)
    if (reason !== undefined) return { ok: false, reason }
    const { ok, stderr } = await gh(['repo', 'clone', `${owner}/${name}`, path.join(target, name)])
    return ok ? { message: `cloned ${owner}/${name} into ${path.join(target, name)}`, ok } : { ok, reason: `gh repo clone ${owner}/${name} failed: ${stderr.trim()}` }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}
