import { readClone, readClones } from '../inventory/git.ts'
import type { GhRunner } from '../inventory/github.ts'
import { run } from '../inventory/shell.ts'
import type { Checker } from './check-script.ts'
import type { Installer } from './install.ts'

/** How the clones are read, replaced by fakes in tests */
export interface GitReaders {
  /** Read one clone, with a `git fetch` when asked */
  readClone: typeof readClone
  /** Read every clone of a folder */
  readClones: typeof readClones
}

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
  /** The repo name, as asked by the page */
  name: string
  /** The GitHub owner the scan compares with */
  owner: string
  /** The folder of projects */
  target: string
}

/** The real git, the default of every action */
export const realGit: GitReaders = { readClone, readClones }

/**
 * Run git with a fixed binary and an argument array, never a shell string
 * @param args the git arguments
 * @returns the outcome, it never throws
 */
export function realRunGit(args: readonly string[]) {
  return run('git', args)
}
