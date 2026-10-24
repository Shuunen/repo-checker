import { stat } from 'node:fs/promises'
import path from 'node:path'
import type { FileReader } from '../engine/io.ts'
import { externalFlags } from '../facts.ts'
import { refused, type Refused } from '../../shared/action.ts'
import type { LocalClone } from '../../shared/project.ts'
import type { GitReaders } from '../inventory/git.ts'
import { getRepo, type GhRunner } from '../inventory/github.ts'

/** A repo name: letters, digits, dots, dashes and underscores, never a path */
const repoName = /^[\w.-]+$/u

/**
 * Tell if a name is a plain repo name, so it can never walk out of the folder of projects
 * @param name the name asked for
 * @returns true for a repo name, false for a path, `.`, `..` or an empty name
 * @example isRepoName('../x') // false
 */
export function isRepoName(name: string) {
  return repoName.test(name) && name !== '.' && name !== '..'
}

/**
 * Tell if a path exists
 * @param file the path
 * @returns true when it exists
 */
export async function exists(file: string) {
  return (await stat(file).catch(() => undefined)) !== undefined
}

/**
 * Prove the target is a folder of projects: an action never runs when the target is itself a git repo (single project mode)
 * @param target the folder
 * @returns the reason to refuse, undefined when it is a folder of projects
 */
export async function checkFolderOfProjects(target: string) {
  return (await exists(path.join(target, '.git'))) ? 'the target is a single project, actions work on a folder of projects' : undefined
}

/**
 * Read the flags of one repo from GitHub: what it says about the repo and the global facts, the same as a scan when GitHub cannot say
 * @param gh the gh runner
 * @param slug `owner/name`
 * @param files the files of the clone, to ask what the npm registry and the web say of the project too
 * @returns the flags
 */
export async function repoFlags(gh: GhRunner, slug: string, files?: Readonly<FileReader>) {
  return externalFlags(await getRepo(gh, slug).catch(() => undefined), files === undefined ? undefined : { files })
}

/**
 * Find the clone of a repo in the folder of projects, if there is one, then read it. Only the origin of the other clones is read, not their git state, so it stays fast with many clones
 * @param where where the clones are
 * @param where.git how the clones are read
 * @param where.target the folder of projects
 * @param slug the `owner/name` of the repo, lowercase like `clone.slug`
 * @param options how to read the clone found
 * @param options.shouldFetch run `git fetch --prune` in it first
 * @returns the clone, undefined when the repo is not cloned, or the reason to refuse when it is cloned more than once
 * @example const found = await findCloneOf({ git: realGit, target: '/projects' }, 'shuunen/finga', { shouldFetch: true })
 */
export async function findCloneOf({ git, target }: Readonly<{ git: GitReaders; target: string }>, slug: string, { shouldFetch }: Readonly<{ shouldFetch: boolean }>): Promise<Refused | { clone: LocalClone | undefined }> {
  const clones = await git.listClones(target)
  const matches = clones.filter(clone => clone.slug === slug)
  if (matches.length > 1) return refused(`${matches.length} clones of ${slug} in ${target}, delete the extra ones by hand`)
  const [match] = matches
  return { clone: match && (await git.readClone(match.path, { shouldFetch })) }
}

/**
 * Find the one clone of a repo in the folder of projects and read it, see `findCloneOf`
 * @param where where the clones are
 * @param where.git how the clones are read
 * @param where.target the folder of projects
 * @param slug the `owner/name` of the repo, lowercase like `clone.slug`
 * @param options how to read the clone found
 * @param options.shouldFetch run `git fetch --prune` in it first
 * @returns the clone, or the reason to refuse when there is none or more than one
 * @example const found = await requireCloneOf({ git: realGit, target: '/projects' }, 'shuunen/finga', { shouldFetch: false })
 */
export async function requireCloneOf(where: Readonly<{ git: GitReaders; target: string }>, slug: string, options: Readonly<{ shouldFetch: boolean }>): Promise<Refused | { clone: LocalClone }> {
  const found = await findCloneOf(where, slug, options)
  if ('reason' in found) return found
  return found.clone === undefined ? refused(`no clone of ${slug} in ${where.target}`) : { clone: found.clone }
}
