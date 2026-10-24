/**
 * What the npm registry knows about the dependencies of a project: the latest version of each package, whether it is deprecated, and the security advisories of the versions in use.
 * They are given to the rules as flags, so the rules stay pure. Answers are kept for an hour so a scan asks once per package, however many projects use it.
 * @module
 */
import type { PackageJson } from './engine/package-json.ts'
import type { Advisory, RegistryFacts } from './engine/flags.ts'
import { type DeclaredDependency, declaredDependencies, packageManagerOf } from './engine/versions.ts'
import { mapLimit } from './inventory/map-limit.ts'

/** The registry, asked over https */
const registryUrl = 'https://registry.npmjs.org'

/** How long to wait for the registry, in ms */
const fetchTimeout = 5000

/** How long an answer is kept, in ms */
const keepMs = 3_600_000

/** How many packages are asked at the same time */
const parallelCalls = 8

/** What the registry needs from the outside, replaced by fakes in tests */
export interface RegistryDeps {
  /** Get the json of a url, rejects when it fails or does not answer ok */
  fetchJson: (url: string, init?: RequestInit) => Promise<unknown>
  /** The current time in milliseconds */
  now: () => number
}

/** The real dependencies */
export const realRegistryDeps: RegistryDeps = {
  async fetchJson(url, init) {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(fetchTimeout) })
    if (!response.ok) throw new Error(`${url} answered HTTP ${response.status}`)
    return response.json()
  },
  now: () => Date.now(),
}

/** What the registry says about one package */
type PackageInfo = RegistryFacts['packages'][string]

/** The fields of the manifest of a version that are read */
interface Manifest {
  deprecated?: unknown
  version: string
}

/** One advisory as the bulk endpoint gives it */
interface ApiAdvisory {
  severity: string
  title: string
  url: string
}

/** What the registry answered for the latest version of a package, kept with the time it was asked */
interface Kept {
  at: number
  info: Promise<PackageInfo | undefined>
}

/**
 * Read what the manifest of a version says
 * @param manifest the manifest the registry sent
 * @returns the latest version, and why it is deprecated when it is
 */
function toInfo(manifest: unknown): PackageInfo {
  const { deprecated, version } = manifest as Manifest
  return typeof deprecated === 'string' ? { deprecated, latest: version } : { latest: version }
}

/**
 * Build the reader of the latest versions, which asks the registry once an hour per package
 * @param deps how to reach the outside
 * @returns a function that gives the latest version and the deprecation of a package, undefined when the registry does not know it or could not be reached
 */
function createInfoReader(deps: Readonly<RegistryDeps>) {
  const cache = new Map<string, Kept>()
  return (name: string) => {
    const kept = cache.get(name)
    if (kept !== undefined && deps.now() - kept.at < keepMs) return kept.info
    const info = deps.fetchJson(`${registryUrl}/${name.replace('/', '%2F')}/latest`).then(
      manifest => toInfo(manifest),
      () => undefined,
    )
    cache.set(name, { at: deps.now(), info })
    return info
  }
}

/**
 * Ask the registry for the advisories of some versions, with one call
 * @param deps how to reach the outside
 * @param versions the versions in use, by package
 * @returns the advisories by `name@version`, undefined when the call failed
 */
async function readAdvisories(deps: Readonly<RegistryDeps>, versions: Readonly<Record<string, string[]>>) {
  try {
    const answer = (await deps.fetchJson(`${registryUrl}/-/npm/v1/security/advisories/bulk`, { body: JSON.stringify(versions), headers: { 'content-type': 'application/json' }, method: 'POST' })) as Record<string, ApiAdvisory[]>
    const toAdvisory = (item: Readonly<ApiAdvisory>): Advisory => ({ severity: item.severity, title: item.title, url: item.url })
    return Object.fromEntries(Object.entries(answer).flatMap(([name, list]) => (versions[name] ?? []).map(version => [`${name}@${version}`, list.map(item => toAdvisory(item))])))
  } catch {
    return undefined
  }
}

/**
 * Group the declared versions by package
 * @param dependencies the declared dependencies
 * @returns the distinct versions of each package
 */
function versionsByName(dependencies: readonly DeclaredDependency[]) {
  return Object.fromEntries(
    Map.groupBy(dependencies, dependency => dependency.name)
      .entries()
      .map(([name, group]) => [name, [...new Set(group.map(dependency => dependency.version))]]),
  )
}

/**
 * Build the client of the registry, with its cache
 * @param deps how to reach the outside
 * @returns the client
 * @example const { factsFor } = createRegistry(realRegistryDeps)
 */
export function createRegistry(deps: Readonly<RegistryDeps>) {
  const infoOf = createInfoReader(deps)

  /**
   * Read what the registry says about the dependencies and the package manager of a project
   * @param pkg the package.json, undefined for a project without one
   * @returns the facts, undefined when the project has nothing to ask about or when the registry could not be reached
   */
  async function factsFor(pkg: Readonly<PackageJson> | undefined): Promise<RegistryFacts | undefined> {
    const dependencies = declaredDependencies(pkg)
    const manager = packageManagerOf(pkg)
    const names = [...new Set([...dependencies.map(dependency => dependency.name), ...(manager === undefined ? [] : [manager.name])])]
    if (names.length === 0) return undefined
    const [infos, advisories] = await Promise.all([mapLimit(names, parallelCalls, name => infoOf(name)), dependencies.length === 0 ? {} : readAdvisories(deps, versionsByName(dependencies))])
    const packages = Object.fromEntries(names.flatMap((name, index) => (infos[index] === undefined ? [] : [[name, infos[index]]])))
    return Object.keys(packages).length === 0 ? undefined : { ...(advisories === undefined ? {} : { advisories }), packages }
  }

  return { factsFor }
}
