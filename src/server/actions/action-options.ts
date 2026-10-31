import { invariant } from 'es-toolkit'
import { type GitReaders, listClones, readClone } from '../inventory/git.ts'
import type { GhRunner } from '../inventory/github.ts'
import { run, type ShellResult } from '../inventory/shell.ts'
import type { Checker } from './check-script.ts'
import { isRepoName } from './guards.ts'
import type { Installer } from './install.ts'

export type { GitReaders } from '../inventory/git.ts'

/** Runs git with an argument array in a folder, never a shell string */
export type GitRunner = (args: readonly string[], cwd: string) => Promise<ShellResult>

/** What an action on a project needs */
export interface ActionOptions {
  /** Runs the `check` script of a project before its fixes are committed, the real one when omitted */
  check?: Checker
  /** Runs gh */
  gh: GhRunner
  /** How the clones are read, the real git in the server, a fake in tests */
  git: GitReaders
  /** Installs the dev dependencies a file fix needs, the real package manager when omitted */
  install?: Installer
  /** Runs git in a folder, the real git when omitted, a fake in tests */
  runGit?: GitRunner
  /** The repo name, as asked by the page */
  name: string
  /** The GitHub owner the scan compares with */
  owner: string
  /** The folder of projects */
  target: string
}

/** The real git, the default of every action */
export const realGit: GitReaders = { listClones, readClone }

/**
 * Run git with a fixed binary and an argument array, never a shell string, the default `runGit` of every action
 * @param args the git arguments
 * @param cwd the folder to run it in
 * @returns the outcome, it never throws
 */
export const realRunGit: GitRunner = (args, cwd) => run('git', args, cwd)

/**
 * Check the name the page asked for is a plain repo name before any action uses it, so it can never walk out of the folder of projects. The routes refuse such a name first, this is the last line
 * @param name the name asked for
 * @returns the same name
 * @throws {Error} when it is a path, `.`, `..` or empty
 * @example const name = repoNameOf('finga')
 */
export function repoNameOf(name: string) {
  invariant(isRepoName(name), `${name} is not a repo name`)
  return name
}
