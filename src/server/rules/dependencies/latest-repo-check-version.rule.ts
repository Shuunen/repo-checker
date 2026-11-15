import { invariant } from 'es-toolkit'
import packageJson from '../../../../package.json' with { type: 'json' }
import { defineRule } from '../../engine/define-rule.ts'
import { dependencyVersion, hasDependency } from '../../engine/package-json.ts'

const name = 'repo-check'

/**
 * Tell if a version is a stable release, a prerelease like 2.0.0-rc.1 cannot be installed with a range like ^2.0
 * @param version the version to check
 * @returns true when the version has no prerelease part
 * @example isStable('2.0.0-rc.1') // false
 */
export const isStable = (version: string) => !version.includes('-')

/**
 * Find the version of repo-check to ask for: the highest one published on npm, else the version of repo-check itself
 * @param flags the project flags
 * @param flags.repoCheckVersion the highest published version, given by the scan
 * @param ownVersion the version of repo-check itself
 * @returns the version
 */
export function wantedRepoCheckVersion({ repoCheckVersion }: Readonly<{ repoCheckVersion?: string }>, ownVersion: string) {
  return repoCheckVersion ?? ownVersion
}

/**
 * Find the version to write for repo-check: `2.1` for a stable release, the exact version for a prerelease because a range like ^2.0 never matches it
 * @param version the version of repo-check to ask for
 * @returns the version without the range prefix
 * @example latestRange('2.1.3') // '2.1'
 * @example latestRange('2.0.0-rc.1') // '2.0.0-rc.1'
 */
export function latestRange(version: string) {
  const [major, minor] = version.split('.')
  return isStable(version) ? `${major}.${minor}` : version
}

/**
 * Make the rule that wants the projects to depend on the latest major.minor of repo-check, or on the exact prerelease while the latest published version is one, like ^2.0.0-rc.1
 * @param repoCheckVersion the version of repo-check itself, used when the scan could not read npm
 * @returns the rule
 * @example const rule = createLatestRepoCheckVersion('1.46.0')
 */
export function createLatestRepoCheckVersion(repoCheckVersion: string) {
  return defineRule({
    appliesTo: ({ flags, pkg }) => flags.repoId !== 'repo-checker' && hasDependency(pkg, name),
    check({ flags, pkg, report }) {
      const version = dependencyVersion(pkg, name)
      invariant(version !== undefined, 'appliesTo guarantees the dependency')
      const latest = latestRange(wantedRepoCheckVersion(flags, repoCheckVersion))
      const section = pkg?.dependencies?.[name] === undefined ? 'devDependencies' : 'dependencies'
      const isLatest = new RegExp(`^[\\^~]?${latest.replaceAll('.', String.raw`\.`)}\\b`, 'u').test(version)
      if (!isLatest) report({ data: { latest }, fix: fixer => fixer.json('package.json').set([section, name], `^${latest}`), messageId: 'outdated' })
    },
    meta: { fixable: true, id: 'latest-repo-check-version', messages: { outdated: 'repo-check is not at the latest version, like "repo-check": "^{{latest}}"' }, severity: 'warning' },
  })
}

export const latestRepoCheckVersion = createLatestRepoCheckVersion(packageJson.version)
