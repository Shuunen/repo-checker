import { invariant } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'
import { forbidInReadme, hasReadme, requireInReadme } from './readme.utils.ts'

/**
 * The text of a new README: a title, the description when known, and a Thanks section
 * @param title the project name
 * @param description what the project does, undefined when unknown
 * @returns the text
 */
function readmeStub(title: string, description: string | undefined) {
  return `# ${title}\n\n${description === undefined ? '' : `${description}\n\n`}## Thanks\n`
}

export const readmeExists = defineRule({
  check({ flags, pkg, readme, report }) {
    if (readme !== undefined) return
    const title = pkg?.name ?? flags.repoId
    if (title === undefined) report({ messageId: 'missing' })
    else report({ fix: fixer => fixer.text('README.md', () => readmeStub(title, pkg?.description ?? flags.githubDescription)), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'readme-exists', messages: { missing: 'no README.md or readme.md file' }, severity: 'error' },
})

export const readmeContentRules = [
  requireInReadme({ id: 'readme-title', message: 'the README does not start with a title, like "# My project"', pattern: /^#\s\w+/u, severity: 'error' }),
  requireInReadme({ id: 'readme-logo', message: 'the README has no logo, like ![logo](folder/any-file.ext)', pattern: /!\[logo\]\(.*\.\w{3,4}\)/u, publicOnly: true, severity: 'warning' }),
  requireInReadme({ id: 'readme-demo', message: 'the README has no demo image or gif, like ![demo](folder/any-file.ext)', pattern: /!\[demo\]\(.*\.\w{3,4}\)/u, publicOnly: true, severity: 'warning' }),
  forbidInReadme({ id: 'readme-no-netlify-com', message: 'the README links to the deprecated *.netlify.com, use *.netlify.app', pattern: /\.netlify\.com/u, severity: 'error' }),
  forbidInReadme({ id: 'readme-links-https', message: 'the README has a link without scheme, like //example.com, use https://', pattern: /[^:]\/\/[\w-]+\.\w+/u, severity: 'error' }),
  forbidInReadme({ fix: text => text.replaceAll('\r\n', '\n'), id: 'readme-no-crlf', message: 'the README has Windows CRLF line endings, use Unix LF', pattern: /\r/u, severity: 'error' }),
  forbidInReadme({ fix: text => text.replaceAll(/\n\*\s(?=[\w[])/gu, '\n- '), id: 'readme-dash-lists', message: 'the README has star flavored lists, use dashes', pattern: /\n\*\s[\w[]/u, severity: 'warning' }),
]

export const readmeTodos = defineRule({
  appliesTo: hasReadme,
  check({ readme, report }) {
    invariant(readme !== undefined, 'appliesTo guarantees a README')
    for (const match of readme.text.matchAll(/^- \[ \] (?<todo>.+)$/gmu)) report({ data: { todo: String(match.groups?.todo) }, messageId: 'todo' })
  },
  meta: { id: 'readme-todos', messages: { todo: 'TODO: {{todo}}' }, severity: 'info' },
})
