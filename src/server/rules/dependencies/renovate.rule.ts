import { forbidInFile, requireFile, requireInFile, requireJsonSchema } from '../../engine/file-rules.ts'

const files = ['renovate.json']

const renovateContent = '{\n  "$schema": "https://docs.renovatebot.com/renovate-schema.json",\n  "dependencyDashboard": false,\n  "extends": [\n    "config:semverAllMonthly",\n    ":automergeAll"\n  ]\n}\n'

export const renovateRules = [
  requireFile({ content: renovateContent, files, id: 'renovate-config-exists', message: 'no {{file}} file, Renovate keeps the dependencies up to date', severity: 'warning', when: ({ pkg }) => pkg !== undefined }),
  requireJsonSchema({ files, id: 'renovate-schema', schema: 'https://docs.renovatebot.com/renovate-schema.json', severity: 'warning' }),
  requireInFile({ files, id: 'renovate-extends', message: '{{file}} has no "extends" section', pattern: /"extends"/u, severity: 'error' }),
  forbidInFile({ files, fix: text => text.replaceAll('"config:base"', '"config:semverAllMonthly"'), id: 'renovate-no-config-base', message: '{{file}} extends the deprecated "config:base", use "config:semverAllMonthly"', pattern: /"config:base"/u, severity: 'error' }),
  requireInFile({ files, id: 'renovate-dashboard-off', message: '{{file}} does not turn the dependency dashboard off, like "dependencyDashboard": false', pattern: /"dependencyDashboard":\s*false/u, severity: 'error' }),
  requireInFile({ files, id: 'renovate-automerge', message: '{{file}} does not use the ":automergeAll" preset', pattern: /":automergeAll"/u, severity: 'error', when: ({ flags }) => flags.canAutoMergeDeps !== false }),
]
