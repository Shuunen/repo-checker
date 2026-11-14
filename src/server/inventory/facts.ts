import { parse } from 'jsonc-parser'
/**
 * The facts that a rule cannot read from the project files but a fixer needs: who the git user is, the current Node LTS, what GitHub says about the repo.
 * They are given to the rules as flags, so the rules stay pure.
 * @module
 */
import { Result } from 'shuutils'
import type { GithubRepo } from '../../shared/project.ts'
import { fallbackNodeVersion, type ProjectFlags } from '../engine/flags.ts'
import type { FileReader } from '../engine/io.ts'
import type { PackageJson } from '../engine/package-json.ts'
import { highestVersion } from '../engine/versions.ts'
import { createRegistry, realRegistryDeps } from './registry.ts'
import { run } from './shell.ts'
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
  const version = await Result.trySafe(
    (async () => {
      const releases = JSON.parse(await fetchText('https://nodejs.org/dist/index.json')) as NodeRelease[]
      return releases.find(release => release.lts !== false)?.version.replace(/^v/u, '') ?? fallbackNodeVersion
    })(),
  )
  return version.ok ? version.value : fallbackNodeVersion
}

/**
 * Find the highest published version of repo-check, a release candidate included, from the dist-tags of npm like `{ "latest": "1.46.0", "rc": "2.0.0-rc.1" }`
 * @param fetchText how to read a url
 * @returns the version, undefined when npm cannot be read
 */
async function publishedRepoCheckVersion(fetchText: FactsDeps['fetchText']) {
  const version = await Result.trySafe(
    (async () => {
      const tags = JSON.parse(await fetchText('https://registry.npmjs.org/-/package/repo-check/dist-tags')) as Record<string, unknown>
      return highestVersion(Object.values(tags).filter((tag): tag is string => typeof tag === 'string'))
    })(),
  )
  return version.ok ? version.value : undefined
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
   * The facts that do not depend on the project: the git user, the Node LTS and the published repo-check
   * @returns the flags, read on the first call only
   */
  function globalFacts() {
    holder.cached ??= (async () => {
      const [name, email, nodeVersion, repoCheckVersion] = await Promise.all([deps.gitConfig('user.name'), deps.gitConfig('user.email'), latestNodeLts(deps.fetchText), publishedRepoCheckVersion(deps.fetchText)])
      return {
        gitAuthor: name === '' ? undefined : { email: email === '' ? undefined : email, name },
        nodeVersion,
        ...(repoCheckVersion === undefined ? {} : { repoCheckVersion }),
      }
    })()
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
 * Tell if an url is the GitHub page of the repo itself, which is no deployed website
 * @param url the url to check
 * @param repo the repo, undefined when GitHub could not say
 * @returns true when the url points to the GitHub repo
 * @example isRepoPage('https://github.com/Shuunen/repo-checker', repo) // true
 */
function isRepoPage(url: string, repo: Readonly<GithubRepo> | undefined) {
  if (repo === undefined) return false
  const path = url.replace(/^https?:\/\/(?:www\.)?github\.com\//iu, '')
  if (path === url) return false
  return path.replace(/\/+$/u, '').toLowerCase() === `${repo.owner}/${repo.name}`.toLowerCase()
}

/**
 * Find the url of the deployed website of a project: the one it declares, else its GitHub Pages
 * @param files the files of the project
 * @param repo the repo, undefined when GitHub could not say
 * @returns the url, undefined when the project has no website
 */
async function websiteOf(files: Readonly<FileReader>, repo: Readonly<GithubRepo> | undefined) {
  const declared = (parse((await files.readText('.repo-checker.json')) ?? '{}') as ProjectFlags).webUrl
  if (declared !== undefined) return isRepoPage(declared, repo) ? undefined : declared
  return repo?.hasPages === true ? `https://${repo.owner}.github.io/${repo.name}/` : undefined
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
