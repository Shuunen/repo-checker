import { invariant } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'
import { forbidInReadme, hasReadme, requireInReadme } from './readme.utils.ts'

export const readmeExists = defineRule({
  check({ readme, report }) {
    if (readme === undefined) report({ messageId: 'missing' })
  },
  meta: { id: 'readme-exists', messages: { missing: 'no README.md or readme.md file' }, severity: 'error' },
})

// biome-ignore format: one rule per line
export const readmeContentRules = [
  requireInReadme({ id: 'readme-title', message: 'the README does not start with a title, like "# My project"', pattern: /^#\s\w+/u, severity: 'error' }),
  requireInReadme({ id: 'readme-logo', message: 'the README has no logo, like ![logo](folder/any-file.ext)', pattern: /!\[logo\]\(.*\.\w{3,4}\)/u, severity: 'warning' }),
  requireInReadme({ id: 'readme-demo', message: 'the README has no demo image or gif, like ![demo](folder/any-file.ext)', pattern: /!\[demo\]\(.*\.\w{3,4}\)/u, severity: 'warning' }),
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
