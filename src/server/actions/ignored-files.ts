import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { run } from '../inventory/shell.ts'

/** Folders that a build or an install recreates, their files are not worth listing before a delete */
const rebuildable = new Set(['.cache', '.turbo', 'coverage', 'dist', 'node_modules'])

/**
 * Tell if a folder holds a file that a build would not recreate. Git collapses a folder that holds only ignored content into one entry, so `packages/` can hold nothing but `packages/a/node_modules/`
 * @param directory the folder
 * @returns true when a file outside the rebuildable folders exists in it, at any depth
 */
async function hasLosableFile(directory: string): Promise<boolean> {
  const entries = await readdir(directory, { withFileTypes: true })
  const found = await Promise.all(entries.filter(entry => !rebuildable.has(entry.name)).map(entry => (entry.isDirectory() ? hasLosableFile(path.join(directory, entry.name)) : true)))
  return found.some(Boolean)
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
