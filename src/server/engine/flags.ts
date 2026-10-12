/**
 * The project flags: what is detected from package.json and the git config, overridden by what the project declares in `.repo-checker.json`.
 * @module
 */
import { isNil } from 'es-toolkit'
import { parse } from 'jsonc-parser'
import type { FileReader } from './io.ts'

/** What the project declares in `.repo-checker.json` or what was detected about it, the successor of the old ProjectData */
export interface ProjectFlags {
  /** A CLI, meant to be run in a terminal */
  isCli?: boolean
  /** An ESM package, `"type": "module"` */
  isModule?: boolean
  /** Published to npm, its scripts run `npm publish` */
  isPublishedPackage?: boolean
  /** Uses Bun as runtime or package manager */
  isUsingBun?: boolean
  /** Uses dependency-cruiser */
  isUsingDependencyCruiser?: boolean
  /** Uses ESLint */
  isUsingEslint?: boolean
  /** Uses shuutils */
  isUsingShuutils?: boolean
  /** Uses TypeScript */
  isUsingTypescript?: boolean
  /** The license the project must declare, only from `.repo-checker.json` */
  license?: string
  /** The maximum size of the main file in Ko, only from `.repo-checker.json` */
  maxSizeKo?: number
  /** The repository name, from the `origin` url of the git config */
  repoId?: string
  /** Report sass dependencies, true unless `.repo-checker.json` says false */
  shouldAvoidSass?: boolean
}

/** The project config file, its content overrides the detected flags */
const configFile = '.repo-checker.json'

/**
 * Detect the flags from the package.json text, the same way the old tool did
 * @param text the package.json text, empty when there is none
 * @returns the detected flags
 */
function detectFromPackageJson(text: string): ProjectFlags {
  return {
    isCli: text.includes('node . ') || text.includes('node ."') || text.includes('"cli"'),
    isModule: text.includes('"type": "module"'),
    isPublishedPackage: text.includes('npm publish'),
    isUsingBun: text.includes('"bun"') || text.includes('bun install'),
    isUsingDependencyCruiser: text.includes('"dependency-cruiser"'),
    isUsingEslint: text.includes('"eslint'),
    isUsingShuutils: text.includes('"shuutils"'),
    isUsingTypescript: /ts-node|typescript|@types/u.test(text),
  }
}

/**
 * Detect the repository name from the `origin` url of a git config
 * @param text the `.git/config` text, empty when there is none
 * @returns the flags with `repoId`, or no flag when no url was found
 */
function detectFromGitConfig(text: string): ProjectFlags {
  const repoId = /url = .*[/:][\w-]+\/(?<repoId>[\w.-]+?)(?:\.git)?$/mu.exec(text)?.groups?.repoId
  return isNil(repoId) ? {} : { repoId }
}

/**
 * Detect the flags of a project, then apply what its `.repo-checker.json` declares
 * @param files the reader of the project files
 * @returns the flags
 * @example const flags = await detectFlags(diskIo(folder))
 */
export async function detectFlags(files: FileReader): Promise<ProjectFlags> {
  const [packageText = '', gitText = '', configText = '{}'] = await Promise.all([files.readText('package.json'), files.readText('.git/config'), files.readText(configFile)])
  return { shouldAvoidSass: true, ...detectFromPackageJson(packageText), ...detectFromGitConfig(gitText), ...(parse(configText) as ProjectFlags) }
}
