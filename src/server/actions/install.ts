import path from 'node:path'
import { run, type ShellResult } from '../inventory/shell.ts'
import { exists } from './guards.ts'

/** Install dev dependencies in a project folder, replaced by a fake in tests */
export type Installer = (folder: string, packages: readonly string[]) => Promise<ShellResult>

/**
 * Install dev dependencies with the package manager of the project: Bun when it has a Bun lockfile, pnpm otherwise. The version prefix is `~`, like the other dependencies of the owner's projects
 * @param folder the project folder
 * @param packages the package names
 * @returns the outcome, it never throws
 * @example await realInstall('/home/me/app', ['knip'])
 */
export const realInstall: Installer = async (folder, packages) => {
  const isBun = (await exists(path.join(folder, 'bun.lock'))) || (await exists(path.join(folder, 'bun.lockb')))
  return isBun ? run('bun', ['add', '--dev', '--tilde', ...packages], folder) : run('pnpm', ['add', '--save-dev', '--save-prefix=~', ...packages], folder)
}
