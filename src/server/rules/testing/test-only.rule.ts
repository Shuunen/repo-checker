import { defineRule } from '../../engine/define-rule.ts'

/** A focused test call at the start of a line, `it.only(`, `test.only(`, `describe.only(` and their `.concurrent` or `.sequential` variants, a mention in a string is not one */
const focused = /^(?<indent>[^\S\n]*)(?<name>describe|it|test)(?<variant>\.(?:concurrent|sequential))?\.only\(/mu

/** A test file */
const testFile = /\.(?:test|spec)\.[cm]?[jt]sx?$/u

/** The folders where the tests live */
const folders = ['src', 'e2e', 'tests', 'test']

export const testNoOnly = defineRule({
  async check({ files, report }) {
    const results = await Promise.all(folders.map(folder => files.search(new RegExp(focused.source, 'mu'), folder)))
    const found = results.flat().filter(file => testFile.test(file))
    for (const file of [...new Set(found)].toSorted()) report({ data: { file }, fix: fixer => fixer.text(file, text => text.replaceAll(new RegExp(focused.source, 'gmu'), '$<indent>$<name>$<variant>(')), messageId: 'found' })
  },
  meta: { fixable: true, id: 'test-no-only', messages: { found: '{{file}} has a focused test (.only), the other tests of the project would be skipped' }, severity: 'error' },
})
