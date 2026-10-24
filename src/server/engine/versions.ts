/**
 * Read and compare the versions a package.json declares, enough for the dependency checks: plain `major.minor.patch` versions, with an optional range prefix.
 * @module
 */
import type { PackageJson } from './package-json.ts'

/** The two sections of a package.json that hold the dependencies the checks look at */
const sections = ['dependencies', 'devDependencies'] as const

/** A declared version: an optional range prefix, then `major.minor.patch`, nothing like a pre-release or a tag after it */
const declared = /^(?<prefix>[~^]|>=|=)?\s*v?(?<version>\d+\.\d+\.\d+)(?![\w.+-])/u

/** A name the npm registry knows, never something that could change the url asked for */
const registryName = /^(?:@[\w.-]+\/)?[\w.-]+$/u

/** The package managers whose latest version the registry gives, and `packageManager` names */
const managers = /^(?<name>bun|npm|pnpm)@(?<version>\d+\.\d+\.\d+)/u

/** What a dependency declares */
export interface DeclaredDependency {
  /** The package name */
  name: string
  /** The range prefix, like `~`, empty for an exact version */
  prefix: string
  /** The section of the package.json that holds it */
  section: (typeof sections)[number]
  /** The version, like `1.2.3` */
  version: string
}

/** How far a newer version is from the declared one */
export type UpdateKind = 'major' | 'minor' | 'patch'

/**
 * Read a declared version
 * @param spec what the package.json says, like `~1.2.3`
 * @returns the prefix and the version, undefined for anything that is not a plain version, like `workspace:*`, `latest`, `^1`, or `1.0.0-beta.1`
 * @example parseSpec('~1.2.3') // { prefix: '~', version: '1.2.3' }
 */
export function parseSpec(spec: string) {
  const groups = declared.exec(spec)?.groups
  return groups?.version === undefined ? undefined : { prefix: groups.prefix ?? '', version: groups.version }
}

/**
 * List the dependencies and the dev dependencies that declare a plain version of a package the registry knows
 * @param pkg the package.json
 * @returns the declared dependencies, in file order
 */
export function declaredDependencies(pkg: Readonly<PackageJson> | undefined): DeclaredDependency[] {
  return sections.flatMap(section =>
    Object.entries(pkg?.[section] ?? {}).flatMap(([name, spec]) => {
      const parsed = parseSpec(spec)
      return parsed !== undefined && registryName.test(name) ? [{ name, section, ...parsed }] : []
    }),
  )
}

/**
 * Read the package manager a package.json pins
 * @param pkg the package.json
 * @returns its name and version, undefined when it pins none or one the registry cannot tell the latest of
 * @example packageManagerOf({ packageManager: 'pnpm@12.9.1+sha512.abc' }) // { name: 'pnpm', version: '12.9.1' }
 */
export function packageManagerOf(pkg: Readonly<PackageJson> | undefined) {
  const groups = managers.exec(pkg?.packageManager ?? '')?.groups
  return groups?.name === undefined || groups.version === undefined ? undefined : { name: groups.name, version: groups.version }
}

/**
 * Compare two `major.minor.patch` versions
 * @param first the first version
 * @param second the second version
 * @returns a negative number when the first is older, a positive one when it is newer, 0 when they are the same
 * @example compareVersions('1.2.3', '1.10.0') // -1
 */
export function compareVersions(first: string, second: string) {
  const firstParts = first.split('.').map(Number)
  const secondParts = second.split('.').map(Number)
  const index = firstParts.findIndex((part, position) => part !== secondParts[position])
  return index === -1 ? 0 : Math.sign(Number(firstParts[index]) - Number(secondParts[index]))
}

/**
 * Tell if a range lets an install get a newer version: `~1.2.3` gets any 1.2.x, `^1.2.3` any 1.x.y, `^0.2.3` any 0.2.x, `>=1.2.3` anything, an exact version nothing
 * @param prefix the range prefix
 * @param mine the declared version
 * @param latest the newer version
 * @returns true when the range admits it
 */
function admits(prefix: string, mine: string, latest: string) {
  const [mineMajor, mineMinor] = mine.split('.')
  const [latestMajor, latestMinor] = latest.split('.')
  if (prefix === '>=') return true
  if (prefix === '~') return mineMajor === latestMajor && mineMinor === latestMinor
  return prefix === '^' && mineMajor === latestMajor && (mineMajor !== '0' || (mineMinor !== '0' && mineMinor === latestMinor))
}

/**
 * Tell how far a newer version is from the declared one, for a version that a fresh install would not get: the range of the declared version does not admit it
 * @param mine the declared version
 * @param latest the newest version
 * @param prefix the range prefix of the declared version, empty for an exact version
 * @returns `major`, `minor` or `patch`, undefined when the declared version is not older or its range admits the newest
 * @example updateKind('1.2.3', '1.4.0') // 'minor'
 */
export function updateKind(mine: string, latest: string, prefix = ''): UpdateKind | undefined {
  if (compareVersions(mine, latest) >= 0 || admits(prefix, mine, latest)) return undefined
  const [mineMajor, mineMinor] = mine.split('.')
  const [latestMajor, latestMinor] = latest.split('.')
  if (mineMajor !== latestMajor) return 'major'
  return mineMinor === latestMinor ? 'patch' : 'minor'
}

/**
 * Give a declared version another version, keeping its range prefix
 * @param spec what the package.json says now, like `~1.2.3`
 * @param version the new version
 * @returns the new spec, like `~1.4.0`
 * @example withVersion('~1.2.3', '1.4.0') // '~1.4.0'
 */
export function withVersion(spec: string, version: string) {
  return `${parseSpec(spec)?.prefix ?? ''}${version}`
}
