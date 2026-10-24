import { testRule } from '../../engine/rule-tester.ts'
import { publishMainFileExists, publishMaxSizeDeclared } from './publish-main-file.rule.ts'

const main = { main: 'dist/index.js' }

testRule(publishMaxSizeDeclared, {
  invalid: [{ errors: ['missing'], name: 'a main file, no max size', pkg: main }],
  valid: [
    { flags: { maxSizeKo: 100 }, name: 'a max size', pkg: main },
    { name: 'no main file', pkg: { name: 'foo' } },
  ],
})

testRule(publishMainFileExists, {
  invalid: [{ errors: ['missing'], flags: { maxSizeKo: 100 }, name: 'main file not built', pkg: main }],
  valid: [
    { files: { 'dist/index.js': 'export {}' }, flags: { maxSizeKo: 100 }, name: 'main file built', pkg: main },
    { name: 'no max size, not checked', pkg: main },
  ],
})
