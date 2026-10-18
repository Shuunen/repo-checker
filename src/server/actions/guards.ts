import { stat } from 'node:fs/promises'
import path from 'node:path'
import type { FileReader } from '../engine/io.ts'
import { externalFlags } from '../facts.ts'
import { knownFleet } from '../fleet.ts'
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
  return externalFlags(await getRepo(gh, slug).catch(() => undefined), files === undefined ? undefined : { files, fleet: knownFleet() })
}
