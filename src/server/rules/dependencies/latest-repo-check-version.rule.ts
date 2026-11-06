import { invariant } from 'es-toolkit'
import packageJson from '../../../../package.json' with { type: 'json' }
import { defineRule } from '../../engine/define-rule.ts'
import { dependencyVersion, hasDependency } from '../../engine/package-json.ts'

const name = 'repo-check'
const [major, minor] = packageJson.version.split('.')
const latest = `${major}.${minor}`

/**
 * Tell if a version is a stable release, a prerelease like 2.0.0-rc.1 cannot be installed with a range like ^2.0
 * @param version the version to check
 * @returns true when the version has no prerelease part
 * @example isStable('2.0.0-rc.1') // false
 */
export const isStable = (version: string) => !version.includes('-')

export const latestRepoCheckVersion = defineRule({
  appliesTo: ({ flags, pkg }) => isStable(packageJson.version) && flags.repoId !== 'repo-checker' && hasDependency(pkg, name),
  check({ pkg, report }) {
    const version = dependencyVersion(pkg, name)
    invariant(version !== undefined, 'appliesTo guarantees the dependency')
    const section = pkg?.dependencies?.[name] === undefined ? 'devDependencies' : 'dependencies'
    const isLatest = new RegExp(`^[\\^~]?${major}\\.${minor}\\b`, 'u').test(version)
    if (!isLatest) report({ data: { latest }, fix: fixer => fixer.json('package.json').set([section, name], `^${latest}`), messageId: 'outdated' })
  },
  meta: { fixable: true, id: 'latest-repo-check-version', messages: { outdated: 'repo-check is not at the latest version, like "repo-check": "^{{latest}}"' }, severity: 'warning' },
})
