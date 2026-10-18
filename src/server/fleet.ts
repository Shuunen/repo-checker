/**
 * The dependencies of every project of a scan, to see the same tool at different versions across projects.
 * The latest full scan is kept, so a rescan of one project and its fixes see the same fleet.
 * @module
 */
import type { Project } from '../shared/project.ts'
import { buildContext } from './engine/context.ts'
import type { Drift } from './engine/flags.ts'
import { diskIo } from './engine/io.ts'
import type { PackageJson } from './engine/package-json.ts'
import { declaredDependencies, updateKind } from './engine/versions.ts'

/** A dependency must be used by this many projects before its versions are compared, two projects are a coincidence */
const minimumProjects = 3

/** How many projects use each version of each package: package, then version */
export type Fleet = Map<string, Map<string, number>>

/** The fleet of the latest full scan */
const known: { fleet: Fleet | undefined } = { fleet: undefined }

/**
 * Keep the fleet of a full scan, for the rescans and the fixes that follow
 * @param fleet the fleet
 */
export function rememberFleet(fleet: Fleet) {
  known.fleet = fleet
}

/**
 * Get the fleet of the latest full scan
 * @returns the fleet, undefined before the first scan
 */
export function knownFleet() {
  return known.fleet
}

/**
 * Read the package.json of every usable clone of the owner that is not archived, and count the versions each package is declared at
 * @param projects the projects of the scan
 * @returns the fleet
 */
export async function readFleet(projects: readonly Project[]): Promise<Fleet> {
  const folders = projects.flatMap(({ github, isOtherOwner, local }) => (local !== undefined && local.problem === undefined && !isOtherOwner && github?.isArchived !== true ? [local.path] : []))
  const contexts = await Promise.all(folders.map(folder => buildContext(diskIo(folder))))
  const fleet: Fleet = new Map()
  for (const { pkg } of contexts)
    for (const { name, version } of declaredDependencies(pkg)) {
      const versions = fleet.get(name) ?? new Map<string, number>()
      versions.set(version, (versions.get(version) ?? 0) + 1)
      fleet.set(name, versions)
    }
  return fleet
}

/**
 * Find the dependencies of a project that are a minor or a major version behind the version most of the other projects use, a patch behind is not worth a finding
 * @param fleet the fleet
 * @param pkg the package.json of the project
 * @returns the most common version of each such package, empty when the project follows the others
 */
export function driftOf(fleet: Readonly<Fleet>, pkg: Readonly<PackageJson> | undefined) {
  const drift: Record<string, Drift> = {}
  for (const { name, version } of declaredDependencies(pkg)) {
    const versions = [...(fleet.get(name) ?? [])].toSorted(([firstVersion, first], [secondVersion, second]) => second - first || secondVersion.localeCompare(firstVersion, 'en', { numeric: true }))
    const total = versions.reduce((sum, [, count]) => sum + count, 0)
    const [common, projects = 0] = versions[0] ?? []
    if (total >= minimumProjects && common !== undefined && (updateKind(version, common) ?? 'patch') !== 'patch') drift[name] = { common, projects }
  }
  return drift
}
