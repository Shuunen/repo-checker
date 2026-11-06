import { testRule } from '../../engine/rule-tester.ts'
import { publishMainFileSize } from './publish-main-file-size.rule.ts'

const twoKo = 'x'.repeat(2048)

testRule(publishMainFileSize, {
  invalid: [{ errors: ['tooBig'], files: { 'dist/index.js': twoKo }, flags: { maxSizeKo: 1 }, name: 'bigger than the max', pkg: { main: 'dist/index.js' } }],
  valid: [
    { files: { 'dist/index.js': twoKo }, flags: { maxSizeKo: 2 }, name: 'equal to the max', pkg: { main: 'dist/index.js' } },
    { files: { 'dist/index.js': twoKo }, name: 'no max declared', pkg: { main: 'dist/index.js' } },
    { flags: { maxSizeKo: 1 }, name: 'no main field', pkg: { name: 'foo' } },
    { flags: { maxSizeKo: 1 }, name: 'main file not built, another rule reports it', pkg: { main: 'dist/index.js' } },
  ],
})
