import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { run, type ShellResult } from '../inventory/shell.ts'
import { exists } from './guards.ts'

/** Run the `check` script of a project folder, replaced by a fake in tests. Calls `onStart` once it is about to run, and gives nothing without calling it when the project has no such script */
export type Checker = (folder: string, onStart: () => void) => Promise<ShellResult | undefined>

/**
 * Tell if the package.json of a folder has a `check` script
 * @param folder the project folder
 * @returns true when it has one, false without package.json, with an unreadable one or without the script
 */
async function hasCheckScript(folder: string) {
  try {
    const manifest = JSON.parse(await readFile(path.join(folder, 'package.json'), 'utf8')) as { scripts?: Record<string, unknown> }
    return typeof manifest.scripts?.['check'] === 'string'
  } catch {
    return false
  }
}

/**
 * Run `check` with the package manager of the project: Bun when it has a Bun lockfile, pnpm otherwise
 * @param folder the project folder
 * @param onStart called when the script is about to run
 * @returns the outcome, or nothing when the project has no `check` script. It never throws
 * @example const result = await realCheck('/home/me/app')
 */
export const realCheck: Checker = async (folder, onStart) => {
  if (!(await hasCheckScript(folder))) return undefined
  onStart()
  const isBun = (await exists(path.join(folder, 'bun.lock'))) || (await exists(path.join(folder, 'bun.lockb')))
  return isBun ? run('bun', ['run', 'check'], folder) : run('pnpm', ['run', 'check'], folder)
}
