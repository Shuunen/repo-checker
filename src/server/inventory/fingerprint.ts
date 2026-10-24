import { createHash } from 'node:crypto'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { run } from './shell.ts'

/** The two letters of a `git status --porcelain` line and the space after them */
const statusPrefix = /^[ !?A-Z]{2} /u

/**
 * Run git without taking the index lock, so looking never fights the git commands of an IDE
 * @param folder the clone folder
 * @param args the git arguments
 * @returns the standard output, empty when the command failed
 */
async function quietGit(folder: string, args: readonly string[]) {
  const { stdout } = await run('git', ['--no-optional-locks', ...args], folder)
  return stdout
}

/**
 * Say when and how big a changed file is, because `git status` prints the same line the second time a modified file is edited
 * @param folder the clone folder
 * @param entry one entry of `git status --porcelain -z`, like ` M package.json`
 * @returns the entry with the modification time and the size of its file, `gone` when the file does not exist
 */
async function stamp(folder: string, entry: string) {
  const stats = await stat(path.join(folder, entry.replace(statusPrefix, ''))).catch(() => undefined)
  return stats === undefined ? `${entry}\tgone` : `${entry}\t${stats.mtimeMs}\t${stats.size}`
}

/**
 * Fingerprint the state of a clone with a few cheap git calls and a `stat` per changed file: two equal fingerprints mean nothing a check reads changed, locally. It holds the branch and its tracking state, the sha of HEAD, every local and remote branch and the stash, and each changed file with its modification time. Files git ignores are not in it, the checks only read the files git knows. Nothing is fetched, so what happens on GitHub is not in it either
 * @param folder the clone folder
 * @returns a hash, the same string while the clone is in the same state
 * @example const before = await fingerprintFolder(folder) // later: before === (await fingerprintFolder(folder)) when nothing changed
 */
export async function fingerprintFolder(folder: string) {
  const [status, refs, head] = await Promise.all([quietGit(folder, ['status', '--porcelain=v1', '-z', '--branch', '--untracked-files=all']), quietGit(folder, ['for-each-ref', '--format=%(objectname) %(refname)', 'refs/heads', 'refs/remotes', 'refs/stash']), quietGit(folder, ['rev-parse', 'HEAD'])])
  const [branch = '', ...changes] = status.split('\0').filter(entry => entry !== '')
  const stamps = await Promise.all(changes.map(entry => stamp(folder, entry)))
  return createHash('sha1')
    .update([branch, head.trim(), refs, ...stamps].join('\n'))
    .digest('hex')
}
