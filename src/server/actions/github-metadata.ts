import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'jsonc-parser'
import type { ActionResult } from '../../shared/action.ts'
import type { GithubRepo } from '../../shared/project.ts'
import type { PackageJson } from '../engine/package-json.ts'
import { getRepo } from '../inventory/github.ts'
import type { ActionOptions } from './action-options.ts'
import { checkFolderOfProjects, isRepoName } from './guards.ts'

/** The start of the address of GitHub itself, a homepage that only points back to the repo says nothing */
const githubAddress = 'https://github.com/'

/**
 * Keep a package.json text value that is worth showing on GitHub
 * @param value the value
 * @returns the trimmed text, undefined when there is none
 */
function usable(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

/**
 * Pick what to copy from the package.json: only a field GitHub has none for, and never a homepage that only points back to GitHub
 * @param repo the repo as GitHub has it
 * @param pkg the package.json of the clone
 * @returns the fields to set, empty when there is nothing to copy
 */
function fieldsToCopy(repo: Readonly<GithubRepo>, pkg: Readonly<PackageJson>) {
  const description = repo.description === undefined ? usable(pkg.description) : undefined
  const homepage = repo.homepage === undefined ? usable(pkg.homepage) : undefined
  return { ...(description !== undefined && { description }), ...(homepage?.startsWith(githubAddress) === false && { homepage }) }
}

/**
 * Find the only clone of a repo and read its package.json
 * @param options the action options
 * @param options.git how the clones are read
 * @param options.target the folder of projects
 * @param repo the repo as GitHub has it
 * @returns the package.json, or the reason there is none
 */
async function readClonePackage({ git, target }: Readonly<ActionOptions>, repo: Readonly<GithubRepo>): Promise<{ pkg: PackageJson } | { reason: string }> {
  const clones = await git.readClones(target, { shouldFetch: false })
  const matches = clones.filter(clone => clone.slug === repo.slug)
  const [clone] = matches
  if (clone === undefined || matches.length > 1) return { reason: `expected one clone of ${repo.slug} in ${target}, found ${matches.length}` }
  const text = await readFile(path.join(clone.path, 'package.json'), 'utf8').catch(() => undefined)
  return text === undefined ? { reason: `the clone of ${repo.slug} has no package.json to copy from` } : { pkg: parse(text) as PackageJson }
}

/**
 * Copy the description and the homepage of the package.json of the clone to the repo on GitHub, only for the fields GitHub has none for, after proving again that the repo is still there, alive and the same repo, and that the clone is the only one. The repo is read back from GitHub to be sure a call that said ok did something
 * @param options what to copy
 * @param options.gh runs gh
 * @param options.git how the clones are read
 * @param options.name the repo name
 * @param options.owner the GitHub owner
 * @param options.target the folder of projects
 * @returns the result, refused with the reason when the proof fails
 * @example const result = await syncGithubMetadata({ gh: ghCli, git: realGit, name: 'finga', owner: 'Shuunen', target })
 */
export async function syncGithubMetadata(options: Readonly<ActionOptions>): Promise<ActionResult> {
  const { gh, name, owner, target } = options
  try {
    if (!isRepoName(name)) return { ok: false, reason: `${name} is not a repo name` }
    const single = await checkFolderOfProjects(target)
    if (single !== undefined) return { ok: false, reason: single }
    const slug = `${owner}/${name}`
    const repo = await getRepo(gh, slug)
    if (repo === undefined) return { ok: false, reason: `${slug} does not exist on GitHub any more` }
    if (repo.isArchived) return { ok: false, reason: `${slug} is archived now, it cannot be changed` }
    const found = await readClonePackage(options, repo)
    if ('reason' in found) return { ok: false, reason: found.reason }
    const fields = fieldsToCopy(repo, found.pkg)
    if (Object.keys(fields).length === 0) return { ok: false, reason: `nothing to copy: ${repo.slug} already has what its package.json says, or the package.json has no description or homepage of its own` }
    const patched = await gh(['api', '--method', 'PATCH', `repos/${slug}`, ...Object.entries(fields).flatMap(([key, value]) => ['-f', `${key}=${value}`])])
    if (!patched.ok) return { ok: false, reason: `GitHub refused to change ${slug}: ${patched.stderr.trim()}` }
    const after = await getRepo(gh, slug)
    const isDone = (fields.description === undefined || after?.description === fields.description) && (fields.homepage === undefined || after?.homepage === fields.homepage)
    return isDone ? { message: `set the ${Object.keys(fields).join(' and ')} of ${slug} on GitHub`, ok: true } : { ok: false, reason: `GitHub said ok but ${slug} did not change, set it by hand on github.com` }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}
