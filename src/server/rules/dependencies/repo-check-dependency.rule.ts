import packageJson from '../../../../package.json' with { type: 'json' }
import { defineRule } from '../../engine/define-rule.ts'
import { hasDependency } from '../../engine/package-json.ts'
import { latestRange, wantedRepoCheckVersion } from './latest-repo-check-version.rule.ts'

const name = 'repo-check'

/**
 * Make the rule that wants the projects to depend on repo-check. The fix adds it to the devDependencies at the latest published major.minor, or at the exact version while it is a prerelease, then installs it
 * @param repoCheckVersion the version of repo-check itself, used when the scan could not read npm
 * @returns the rule
 * @example const rule = createRepoCheckDependency('1.46.0')
 */
export function createRepoCheckDependency(repoCheckVersion: string) {
  return defineRule({
    appliesTo: ({ flags, pkg }) => pkg !== undefined && flags.repoId !== 'repo-checker' && !hasDependency(pkg, name),
    check({ flags, report }) {
      const range = `^${latestRange(wantedRepoCheckVersion(flags, repoCheckVersion))}`
      report({ fix: fixer => fixer.json('package.json').set(['devDependencies', name], range), installs: [name], messageId: 'missing' })
    },
    meta: { fixable: true, id: 'repo-check-dependency', messages: { missing: 'repo-check is not installed, like "devDependencies": { "repo-check": "^1.0" }' }, severity: 'warning' },
  })
}

export const repoCheckDependency = createRepoCheckDependency(packageJson.version)
