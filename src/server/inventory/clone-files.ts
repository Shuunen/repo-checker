import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Result } from 'shuutils'
import { readVitePorts, type VitePorts } from '../../shared/vite-ports.ts'

/** The vite configs, the first one found is read */
const viteConfigs = ['vite.config.mts', 'vite.config.ts', 'vite.config.mjs', 'vite.config.js']

/** What the checks about a project need from its files, read once while the clone is read */
interface CloneFiles {
  /** False when the clone has no package.json at its root */
  hasPackageJson: boolean
  /** The `version` of package.json, undefined when it has none or the file cannot be parsed */
  packageVersion: string | undefined
  /** The ports of the vite config, undefined when the clone has no vite config */
  vitePorts: VitePorts | undefined
}

/**
 * Read a text file
 * @param folder the clone folder
 * @param file the file, relative to the folder
 * @returns the text, undefined when the file cannot be read
 */
function readText(folder: string, file: string) {
  return readFile(path.join(folder, file), 'utf8').catch(() => undefined)
}

/**
 * Read the version of a package.json text
 * @param text the text, undefined when there is no file
 * @returns the version, undefined when there is none
 */
function versionOf(text: string | undefined) {
  const read = Result.trySafe(() => {
    const { version } = JSON.parse(text ?? '') as { version?: unknown }
    return typeof version === 'string' ? version : undefined
  })
  return read.ok ? read.value : undefined
}

/**
 * Read the facts of a clone that live in its files: the package.json and the vite config
 * @param folder the clone folder
 * @returns the facts
 * @example const { packageVersion } = await readCloneFiles('/projects/app') // '1.2.0'
 */
export async function readCloneFiles(folder: string): Promise<CloneFiles> {
  const [packageText, ...configs] = await Promise.all([readText(folder, 'package.json'), ...viteConfigs.map(file => readText(folder, file))])
  const config = configs.find(text => text !== undefined)
  return { hasPackageJson: packageText !== undefined, packageVersion: versionOf(packageText), vitePorts: config === undefined ? undefined : readVitePorts(config) }
}
