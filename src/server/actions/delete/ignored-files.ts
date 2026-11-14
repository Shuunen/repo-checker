import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { run } from '../../inventory/shell.ts'

/** Folders that a build or an install recreates, their files are not worth listing before a delete */
const rebuildable = new Set(['.cache', '.turbo', 'coverage', 'dist', 'node_modules'])

/**
 * Tell if one of the folders holds a file, one folder at a time so a huge tree never opens thousands of folders at once
 * @param directories the folders
 * @returns true at the first file found
 */
async function anyHoldsFile(directories: readonly string[]): Promise<boolean> {
  const [directory, ...rest] = directories
  if (directory === undefined) return false
  // oxlint-disable-next-line no-use-before-define -- the two walk each other
  return (await hasLosableFile(directory)) || anyHoldsFile(rest)
}

/**
 * Tell if a folder holds a file that a build would not recreate. Git collapses a folder that holds only ignored content into one entry, so `packages/` can hold nothing but `packages/a/node_modules/`. It stops at the first file found, a big ignored tree like `.venv/` is not walked in full
 * @param directory the folder
 * @returns true when a file outside the rebuildable folders exists in it, at any depth
 */
async function hasLosableFile(directory: string): Promise<boolean> {
  const all = await readdir(directory, { withFileTypes: true })
  const entries = all.filter(entry => !rebuildable.has(entry.name))
  if (entries.some(entry => !entry.isDirectory())) return true
  return anyHoldsFile(entries.map(entry => path.join(directory, entry.name)))
}

/**
 * List the files a delete of a clone would lose that git does not know: the ignored ones, like a `.env` or a local database, leaving out the folders that a build recreates. A folder is listed once, with a trailing slash
 * @param folder the clone
 * @returns the paths, relative to the clone, sorted
 * @throws {Error} when git cannot list them
 * @example await listIgnoredFiles('/home/me/projects/app') // ['.env', 'data/']
 */
export async function listIgnoredFiles(folder: string) {
  const { ok, stderr, stdout } = await run('git', ['ls-files', '--others', '--ignored', '--exclude-standard', '--directory'], folder)
  if (!ok) throw new Error(`git ls-files failed in ${folder}: ${stderr.trim()}`)
  const entries = stdout.split('\n').filter(line => line !== '' && !line.split('/').some(segment => rebuildable.has(segment)))
  const losable = await Promise.all(entries.map(async entry => !entry.endsWith('/') || (await hasLosableFile(path.join(folder, entry)))))
  return entries.filter((_entry, index) => losable[index]).toSorted()
}
