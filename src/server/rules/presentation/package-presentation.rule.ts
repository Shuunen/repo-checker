import { defineRule } from '../../engine/define-rule.ts'
import type { PackageJson } from '../../engine/package-json.ts'
import { requireProperty } from '../../engine/require-property.ts'

// biome-ignore format: one rule per line
export const presentationPropertyRules = [
  requireProperty({ id: 'package-author', key: 'author', severity: 'error' }),
  requireProperty({ id: 'package-bugs', key: 'bugs', severity: 'warning' }),
  requireProperty({ id: 'package-description', key: 'description', severity: 'warning' }),
  requireProperty({ id: 'package-homepage', key: 'homepage', severity: 'warning' }),
  requireProperty({ id: 'package-keywords', key: 'keywords', severity: 'warning' }),
]

export const packageLicense = defineRule({
  appliesTo: ({ pkg }) => pkg !== undefined,
  check({ flags, pkg, report }) {
    if (pkg?.license === undefined) report({ messageId: 'missing' })
    else if (flags.license !== undefined && pkg.license !== flags.license) report({ data: { expected: flags.license, license: pkg.license }, messageId: 'wrong' })
  },
  meta: { id: 'package-license', messages: { missing: 'package.json has no "license" property', wrong: 'package.json license is {{license}}, .repo-checker.json expects {{expected}}' }, severity: 'error' },
})

/**
 * Get the url of a repository field
 * @param repository the field, a shorthand string or an object
 * @returns the url, undefined when there is none
 */
function repositoryUrl(repository: PackageJson['repository']) {
  return typeof repository === 'string' ? repository : repository?.url
}

export const packageRepository = defineRule({
  appliesTo: ({ pkg }) => pkg !== undefined,
  check({ pkg, report }) {
    const url = repositoryUrl(pkg?.repository)
    if (url === undefined) report({ messageId: 'missing' })
    else if (!url.startsWith('git+https')) report({ data: { url }, messageId: 'noGitPlus', ...(typeof pkg?.repository === 'object' && url.startsWith('https') && { fix: fixer => fixer.json('package.json').set(['repository', 'url'], `git+${url}`) }) })
  },
  meta: { fixable: true, id: 'package-repository', messages: { missing: 'package.json has no "repository" property', noGitPlus: 'package.json repository url {{url}} should start with git+https' }, severity: 'warning' },
})
