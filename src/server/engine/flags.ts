/**
 * The project flags: what is detected from package.json and the git config, overridden by what the project declares in `.repo-checker.json`.
 * @module
 */
import { isNil } from 'es-toolkit'
import { parse } from 'jsonc-parser'
import type { FileReader } from './io.ts'

/** One security advisory of the npm registry that affects a version in use */
export interface Advisory {
  /** How bad it is, like `high` */
  severity: string
  /** What it is about */
  title: string
  /** Where to read about it */
  url: string
}

/** What the npm registry says about the dependencies of a project, given by the scan: absent when the registry could not be reached */
export interface RegistryFacts {
  /** The advisories of the declared versions, by `name@version`, absent when the advisory call failed. A version without advisory is not in it */
  advisories?: Record<string, Advisory[]>
  /** The latest version of each package of the project, and why it is deprecated when it is. The package manager is in it too */
  packages: Record<string, { deprecated?: string; latest: string }>
}

/** Whether the deployed website of a project answers, given by the scan */
export interface WebStatus {
  /** The HTTP status, or `unreachable` when the request failed */
  status: number | 'unreachable'
  /** The url that was asked */
  url: string
}

/** What the project declares in `.repo-checker.json` or what was detected about it, the successor of the old ProjectData */
export interface ProjectFlags {
  /** Renovate may merge dependency updates on its own, true unless `.repo-checker.json` says false */
  canAutoMergeDeps?: boolean
  /** The git config has a `main` branch */
  hasMainBranch?: boolean
  /** A CLI, meant to be run in a terminal */
  isCli?: boolean
  /** An ESM package, `"type": "module"` */
  isModule?: boolean
  /** The git user, from the global git config, used to fill the author of a new file */
  gitAuthor?: { email?: string | undefined; name: string } | undefined
  /** The description of the GitHub repo, given by the scan */
  githubDescription?: string | undefined
  /** The topics of the GitHub repo, given by the scan, empty when it has none */
  githubTopics?: string[] | undefined
  /** The GitHub repo is private, given by the scan, never detected from the files */
  isPrivate?: boolean
  /** Published to npm, its scripts run `npm publish` */
  isPublishedPackage?: boolean
  /** No package.json and no JavaScript or TypeScript file: the Node checks do not apply, detected */
  isNotNode?: boolean
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
  /** Published as a website or web app, so its README shows a "Website up" badge */
  isWebPublished?: boolean
  /** The license the project must declare, only from `.repo-checker.json` */
  license?: string
  /** The maximum size of the build output of a website in Ko, only from `.repo-checker.json` */
  maxBuildSizeKo?: number
  /** The maximum size of the main file in Ko, only from `.repo-checker.json` */
  maxSizeKo?: number
  /** The latest Node LTS, given by the scan, like `24.11.0` */
  nodeVersion?: string
  /** The GitHub owner, from the `origin` url of the git config */
  owner?: string
  /** What the npm registry says about the dependencies, given by the scan, absent when it could not be reached */
  registry?: RegistryFacts
  /** The repository name, from the `origin` url of the git config */
  repoId?: string
  /** Report sass dependencies, true unless `.repo-checker.json` says false */
  shouldAvoidSass?: boolean
  /** Whether the deployed website answers, given by the scan, absent when the project has no website, or when the machine is offline */
  webStatus?: WebStatus
  /** The url of the deployed website or web app, only from `.repo-checker.json`. Not the `homepage` of the package.json, which is the homepage of the source code (the repo) */
  webUrl?: string
}

/** The Node version used when the LTS cannot be read from nodejs.org */
export const fallbackNodeVersion = '26.13.0'

/**
 * The GitHub url of the project, from the `origin` of its git config
 * @param flags the project flags
 * @param flags.owner the GitHub owner
 * @param flags.repoId the repository name
 * @returns the url, undefined when the project has no GitHub origin
 * @example repoUrl({ owner: 'Shuunen', repoId: 'app' }) // 'https://github.com/Shuunen/app'
 */
export function repoUrl({ owner, repoId }: Readonly<ProjectFlags>) {
  return owner === undefined || repoId === undefined ? undefined : `https://github.com/${owner}/${repoId}`
}

/** The project config file, its content overrides the detected flags */
const configFile = '.repo-checker.json'

/**
 * Detect what kind of project it is from the package.json text: a CLI, an ESM package, published to npm, published as a website
 * @param text the package.json text, empty when there is none
 * @returns the detected flags
 */
function detectKind(text: string): ProjectFlags {
  return {
    isCli: text.includes('node . ') || text.includes('node ."') || text.includes('"cli"'),
    isModule: text.includes('"type": "module"'),
    isPublishedPackage: text.includes('npm publish'),
    isWebPublished: /webapp|webcomponent|website|"(?:nuxt|vitepress|vue)"/u.test(text),
  }
}

/**
 * Detect the flags from the package.json text, the same way the old tool did
 * @param text the package.json text, empty when there is none
 * @returns the detected flags
 */
function detectFromPackageJson(text: string): ProjectFlags {
  return {
    ...detectKind(text),
    isUsingBun: text.includes('"bun"') || text.includes('bun install'),
    isUsingDependencyCruiser: text.includes('"dependency-cruiser"'),
    isUsingEslint: text.includes('"eslint'),
    isUsingShuutils: text.includes('"shuutils"'),
    isUsingTypescript: /ts-node|typescript|@types/u.test(text),
  }
}

/**
 * Detect the owner and the repository name from the `origin` url of a git config, and whether it has a `main` branch
 * @param text the `.git/config` text, empty when there is none
 * @returns `hasMainBranch`, plus `owner` and `repoId` when an origin url was found
 */
function detectFromGitConfig(text: string): ProjectFlags {
  const groups = /url = .*[/:](?<owner>[\w-]+)\/(?<repoId>[\w.-]+?)(?:\.git)?$/mu.exec(text)?.groups
  const origin = isNil(groups?.owner) || isNil(groups.repoId) ? {} : { owner: groups.owner, repoId: groups.repoId }
  return { ...origin, hasMainBranch: text.includes('[branch "main"]') }
}

/** The files that tell a project runs on Node, or in a browser with a build */
const scriptFile = /\.(?:[cm]?[jt]sx?|vue|svelte|astro)$/u

/**
 * Tell if a project has at least one JavaScript or TypeScript file
 * @param files the reader of the project files
 * @returns true when it has one
 */
async function hasScriptFile(files: FileReader) {
  const found = await files.search(/\S/u)
  return found.some(file => scriptFile.test(file))
}

/**
 * Detect the flags of a project, then apply what its `.repo-checker.json` declares
 * @param files the reader of the project files
 * @returns the flags
 * @example const flags = await detectFlags(diskIo(folder))
 */
export async function detectFlags(files: FileReader): Promise<ProjectFlags> {
  const [packageText, gitText = '', configText = '{}'] = await Promise.all([files.readText('package.json'), files.readText('.git/config'), files.readText(configFile)])
  const isNotNode = packageText === undefined && !(await hasScriptFile(files))
  return { canAutoMergeDeps: true, isNotNode, shouldAvoidSass: true, ...detectFromPackageJson(packageText ?? ''), ...detectFromGitConfig(gitText), ...(parse(configText) as ProjectFlags) }
}
