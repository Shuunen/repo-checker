import { isEqual } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'
import { repoUrl } from '../../engine/flags.ts'
import type { PackageJson } from '../../engine/package-json.ts'
import { requireProperty } from '../../engine/require-property.ts'

export const presentationPropertyRules = [
  requireProperty({ id: 'package-author', key: 'author', severity: 'error', value: ({ flags }) => (flags.gitAuthor === undefined ? undefined : `${flags.gitAuthor.name}${flags.gitAuthor.email === undefined ? '' : ` <${flags.gitAuthor.email}>`}`) }),
  requireProperty({ id: 'package-bugs', key: 'bugs', severity: 'warning', value: ({ flags }) => (repoUrl(flags) === undefined ? undefined : `${repoUrl(flags)}/issues`) }),
  requireProperty({ id: 'package-description', key: 'description', severity: 'warning', value: ({ flags }) => flags.githubDescription }),
  requireProperty({ id: 'package-homepage', key: 'homepage', severity: 'warning', value: ({ flags }) => repoUrl(flags) }),
  requireProperty({ id: 'package-keywords', key: 'keywords', severity: 'warning', value: ({ flags }) => (flags.githubTopics?.length ? flags.githubTopics : undefined) }),
]

/** The license of a project that does not declare one */
export const defaultLicense = 'MIT'

export const packageLicense = defineRule({
  appliesTo: ({ pkg }) => pkg !== undefined,
  check({ flags, pkg, report }) {
    if (pkg?.license === undefined) report({ fix: fixer => fixer.json('package.json').set(['license'], flags.license ?? defaultLicense), messageId: 'missing' })
    else if (flags.license !== undefined && pkg.license !== flags.license) report({ data: { expected: flags.license, license: pkg.license }, messageId: 'wrong' })
  },
  meta: { fixable: true, id: 'package-license', messages: { missing: 'package.json has no "license" property', wrong: 'package.json license is {{license}}, .repo-checker.json expects {{expected}}' }, severity: 'error' },
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
  check({ flags, pkg, report }) {
    const url = repositoryUrl(pkg?.repository)
    const expected = repoUrl(flags) === undefined ? undefined : { type: 'git', url: `git+${repoUrl(flags)}.git` }
    if (url === undefined) report({ messageId: 'missing', ...(expected !== undefined && { fix: fixer => fixer.json('package.json').set(['repository'], expected) }) })
    else if (expected !== undefined) {
      if (!isEqual(pkg?.repository, expected)) report({ data: { expected: expected.url, url }, fix: fixer => fixer.json('package.json').set(['repository'], expected), messageId: 'wrong' })
    } else if (!url.startsWith('git+https')) report({ data: { url }, messageId: 'noGitPlus', ...(typeof pkg?.repository === 'object' && url.startsWith('https') && { fix: fixer => fixer.json('package.json').set(['repository', 'url'], `git+${url}`) }) })
  },
  meta: {
    fixable: true,
    id: 'package-repository',
    messages: { missing: 'package.json has no "repository" property', noGitPlus: 'package.json repository url {{url}} should start with git+https', wrong: 'package.json repository is {{url}}, it should be { "type": "git", "url": "{{expected}}" }, like the git origin' },
    severity: 'warning',
  },
})
