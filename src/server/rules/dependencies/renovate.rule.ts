import { invariant } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'
import { forbidInFile, requireFile, requireInFile, requireJsonSchema } from '../../engine/file-rules.ts'
import { editExtends, hasDuplicatePreset, withSemverAllMonthly } from './renovate.utils.ts'

const files = ['renovate.json']

const renovateContent = '{\n  "$schema": "https://docs.renovatebot.com/renovate-schema.json",\n  "dependencyDashboard": false,\n  "extends": [\n    "config:semverAllMonthly",\n    ":automergeAll",\n    ":preserveSemverRanges"\n  ]\n}\n'

const noDuplicatePreset = defineRule({
  appliesTo: async ({ files: reader }) => (await reader.readText('renovate.json')) !== undefined,
  async check({ files: reader, report }) {
    const text = await reader.readText('renovate.json')
    invariant(text !== undefined, 'appliesTo guarantees a renovate.json')
    if (hasDuplicatePreset(text)) report({ fix: fixer => fixer.text('renovate.json', current => editExtends(current, items => [...new Set(items)])), messageId: 'found' })
  },
  meta: { fixable: true, id: 'renovate-no-duplicate-preset', messages: { found: 'renovate.json lists the same preset twice in "extends"' }, severity: 'warning' },
})

export const renovateRules = [
  requireFile({ content: renovateContent, files, id: 'renovate-config-exists', message: 'no {{file}} file, Renovate keeps the dependencies up to date', severity: 'warning', when: ({ pkg }) => pkg !== undefined }),
  requireJsonSchema({ files, id: 'renovate-schema', schema: 'https://docs.renovatebot.com/renovate-schema.json', severity: 'warning' }),
  requireInFile({ files, id: 'renovate-extends', message: '{{file}} has no "extends" section', pattern: /"extends"/u, severity: 'error' }),
  forbidInFile({ files, fix: text => text.replaceAll('"config:base"', '"config:semverAllMonthly"'), id: 'renovate-no-config-base', message: '{{file}} extends the deprecated "config:base", use "config:semverAllMonthly"', pattern: /"config:base"/u, severity: 'error' }),
  requireInFile({ files, id: 'renovate-dashboard-off', message: '{{file}} does not turn the dependency dashboard off, like "dependencyDashboard": false', pattern: /"dependencyDashboard":\s*false/u, severity: 'error' }),
  requireInFile({ files, id: 'renovate-automerge', message: '{{file}} does not use the ":automergeAll" preset', pattern: /":automergeAll"/u, severity: 'error', when: ({ flags }) => flags.canAutoMergeDeps !== false }),
  requireInFile({
    files,
    fix: text => editExtends(text, withSemverAllMonthly),
    id: 'renovate-semver-all-monthly',
    message: '{{file}} does not use the "config:semverAllMonthly" preset, it groups the updates once a month',
    onlyIf: /"extends"\s*:\s*\[/u,
    pattern: /"config:semverAllMonthly"/u,
    severity: 'warning',
  }),
  requireInFile({
    files,
    fix: text => editExtends(text, items => [...items, ':preserveSemverRanges']),
    id: 'renovate-preserve-semver-ranges',
    message: '{{file}} does not use the ":preserveSemverRanges" preset, a bump would rewrite "^1.2.0" as "1.3.0"',
    onlyIf: /"extends"\s*:\s*\[/u,
    pattern: /":preserveSemverRanges"/u,
    severity: 'warning',
  }),
  noDuplicatePreset,
]
