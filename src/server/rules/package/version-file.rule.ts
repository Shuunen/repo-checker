import { invariant } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'
import { requireFile } from '../../engine/file-rules.ts'

export const versionFileExists = requireFile({
  content: ({ pkg }) => {
    invariant(pkg?.version !== undefined, 'the rule only applies to a project with a version')
    return `${pkg.version}\n`
  },
  files: ['VERSION'],
  id: 'version-file-exists',
  message: 'no {{file}} file, it holds the version of package.json so tools can read it without parsing json',
  severity: 'warning',
  when: ({ pkg }) => pkg?.version !== undefined,
})

export const versionFileInSync = defineRule({
  async appliesTo({ files, pkg }) {
    return pkg?.version !== undefined && (await files.readText('VERSION')) !== undefined
  },
  async check({ files, pkg, report }) {
    const text = await files.readText('VERSION')
    invariant(text !== undefined && pkg?.version !== undefined, 'appliesTo guarantees a VERSION file and a version')
    if (text.trim() !== pkg.version) report({ data: { file: text.trim(), version: pkg.version }, fix: fixer => fixer.text('VERSION', () => `${pkg.version}\n`), messageId: 'wrong' })
  },
  meta: { fixable: true, id: 'version-file-in-sync', messages: { wrong: 'VERSION says "{{file}}" but package.json version is {{version}}, bump both in the same commit' }, severity: 'warning' },
})
