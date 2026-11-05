/**
 * The facts that a rule cannot read from the project files but a fixer needs: who the git user is, the current Node LTS, what GitHub says about the repo.
 * They are given to the rules as flags, so the rules stay pure.
 * @module
 */
import { parse } from 'jsonc-parser'
import type { GithubRepo } from '../shared/project.ts'
import type { PackageJson } from './engine/package-json.ts'
import { fallbackNodeVersion, type ProjectFlags } from './engine/flags.ts'
import type { FileReader } from './engine/io.ts'
import { run } from './inventory/shell.ts'
import { createRegistry, realRegistryDeps } from './registry.ts'
import { createSiteStatus, realSiteDeps } from './site-status.ts'

/** How long to wait for nodejs.org, in ms */
const fetchTimeout = 3000

/** What the facts need from the outside, replaced by fakes in tests */
interface FactsDeps {
  /** Get the text of a url, rejects when it fails */
  fetchText: (url: string) => Promise<string>
  /** Read a git config value, empty when unset */
  gitConfig: (key: string) => Promise<string>
}

/** The real dependencies */
export const realDeps: FactsDeps = {
  async fetchText(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(fetchTimeout) })
    return response.text()
  },
  async gitConfig(key) {
    const { stdout } = await run('git', ['config', '--global', key])
    return stdout.trim()
  },
}

/** One entry of the Node release index */
interface NodeRelease {
  /** The LTS codename, false for a release that is not an LTS */
  lts: string | false
  /** The version, like `v24.11.0` */
  version: string
}

/**
 * Find the latest LTS version of Node
 * @param fetchText how to read a url
 * @returns the version without the `v`, the fallback when it cannot be read
 */
async function latestNodeLts(fetchText: FactsDeps['fetchText']) {
  try {
    const releases = JSON.parse(await fetchText('https://nodejs.org/dist/index.json')) as NodeRelease[]
    return releases.find(release => release.lts !== false)?.version.replace(/^v/u, '') ?? fallbackNodeVersion
  } catch {
    return fallbackNodeVersion
  }
}

/**
 * Build the reader of the global facts, read once then kept
 * @param deps how to reach the outside
 * @returns the reader
 * @example const { globalFacts } = createFacts(realDeps)
 */
export function createFacts(deps: Readonly<FactsDeps>) {
  const holder: { cached?: Promise<ProjectFlags> } = {}
  /**
   * The facts that do not depend on the project: the git user and the Node LTS
   * @returns the flags, read on the first call only
   */
  function globalFacts() {
    holder.cached ??= Promise.all([deps.gitConfig('user.name'), deps.gitConfig('user.email'), latestNodeLts(deps.fetchText)]).then(([name, email, nodeVersion]) => ({ gitAuthor: name === '' ? undefined : { email: email === '' ? undefined : email, name }, nodeVersion }))
    return holder.cached
  }
  return { globalFacts }
}

/** The facts of the real machine */
const { globalFacts } = createFacts(realDeps)

/**
 * The flags that come from what GitHub says about a repo
 * @param repo the repo, undefined when GitHub could not say
 * @returns the flags
 */
export function githubFlags(repo: Readonly<GithubRepo> | undefined): ProjectFlags {
  return { githubDescription: repo?.description, githubTopics: repo?.topics, isPrivate: repo?.isPrivate === true }
}

/** What the facts about a project itself need: its files */
interface ProjectScope {
  /** The files of the project */
  files: FileReader
}

/** The registry of the real machine */
const { factsFor } = createRegistry(realRegistryDeps)

/** The probe of the sites of the real machine */
const { statusOf } = createSiteStatus(realSiteDeps)

/**
 * Find the url of the deployed website of a project: the one it declares, else its GitHub Pages
 * @param files the files of the project
 * @param repo the repo, undefined when GitHub could not say
 * @returns the url, undefined when the project has no website
 */
async function websiteOf(files: Readonly<FileReader>, repo: Readonly<GithubRepo> | undefined) {
  const declared = (parse((await files.readText('.repo-checker.json')) ?? '{}') as ProjectFlags).webUrl
  return declared ?? (repo?.hasPages === true ? `https://${repo.owner}.github.io/${repo.name}/` : undefined)
}

/**
 * The flags that come from what the outside says about the project itself: the npm registry for its dependencies, the web for its website, the other projects for its versions
 * @param scope the project files
 * @param repo the repo, undefined when GitHub could not say
 * @returns the flags, a fact the outside could not give is left out
 */
async function projectFlags(scope: Readonly<ProjectScope>, repo: Readonly<GithubRepo> | undefined): Promise<ProjectFlags> {
  const text = await scope.files.readText('package.json')
  const pkg = text === undefined ? undefined : (parse(text) as PackageJson)
  const url = await websiteOf(scope.files, repo)
  const [registry, webStatus] = await Promise.all([factsFor(pkg), url === undefined ? undefined : statusOf(url)])
  return { ...(registry === undefined ? {} : { registry }), ...(webStatus === undefined ? {} : { webStatus }) }
}

/**
 * Every flag that is not read from the project files: the global facts, what GitHub says, and, given the project files, what the npm registry and the web say
 * @param repo the repo, undefined when GitHub could not say
 * @param scope the project files, leave it out for the facts that do not depend on the project
 * @returns the flags
 */
export async function externalFlags(repo: Readonly<GithubRepo> | undefined, scope?: Readonly<ProjectScope>): Promise<ProjectFlags> {
  return { ...(await globalFacts()), ...githubFlags(repo), ...(scope === undefined ? {} : await projectFlags(scope, repo)) }
}
