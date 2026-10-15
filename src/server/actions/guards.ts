import { stat } from 'node:fs/promises'
import path from 'node:path'
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
 * Tell if the GitHub repo is private, false when GitHub cannot say
 * @param gh the gh runner
 * @param slug `owner/name`
 * @returns true for a private repo
 */
export async function isPrivateRepo(gh: GhRunner, slug: string) {
  const repo = await getRepo(gh, slug).catch(() => undefined)
  return repo?.isPrivate === true
}
