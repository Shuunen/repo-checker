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
 * Make the rule that wants the projects to depend on the latest major.minor of repo-check. It is silent while that version is a prerelease, nothing on npm matches it yet
 * @param repoCheckVersion the version of repo-check itself
 * @returns the rule
 * @example const rule = createLatestRepoCheckVersion('1.46.0')
 */
export function createLatestRepoCheckVersion(repoCheckVersion: string) {
  const [major, minor] = repoCheckVersion.split('.')
  const latest = `${major}.${minor}`
  return defineRule({
    appliesTo: ({ flags, pkg }) => isStable(repoCheckVersion) && flags.repoId !== 'repo-checker' && hasDependency(pkg, name),
    check({ pkg, report }) {
      const version = dependencyVersion(pkg, name)
      invariant(version !== undefined, 'appliesTo guarantees the dependency')
      const section = pkg?.dependencies?.[name] === undefined ? 'devDependencies' : 'dependencies'
      const isLatest = new RegExp(`^[\\^~]?${major}\\.${minor}\\b`, 'u').test(version)
      if (!isLatest) report({ data: { latest }, fix: fixer => fixer.json('package.json').set([section, name], `^${latest}`), messageId: 'outdated' })
    },
    meta: { fixable: true, id: 'latest-repo-check-version', messages: { outdated: 'repo-check is not at the latest version, like "repo-check": "^{{latest}}"' }, severity: 'warning' },
  })
}

export const latestRepoCheckVersion = createLatestRepoCheckVersion(packageJson.version)
