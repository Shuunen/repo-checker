import { testRule } from '../../engine/rule-tester.ts'
import { buildSize } from './build-size.rule.ts'

const big = 'x'.repeat(3000)

testRule(buildSize, {
  invalid: [
    { errors: ['tooBig'], files: { 'dist/index.js': big }, flags: { isWebPublished: true, maxBuildSizeKo: 2 }, name: 'a dist folder over the maximum' },
    { errors: ['tooBig'], files: { 'build/a.js': big, 'build/b.js': big }, flags: { isWebPublished: true, maxBuildSizeKo: 5 }, name: 'the files of a build folder add up' },
  ],
  valid: [
    { files: { 'dist/index.js': big }, flags: { isWebPublished: true, maxBuildSizeKo: 10 }, name: 'under the maximum' },
    { flags: { isWebPublished: true, maxBuildSizeKo: 1 }, name: 'not built' },
    { files: { 'dist/index.js': big }, flags: { isWebPublished: true }, name: 'no declared maximum' },
    { files: { 'dist/index.js': big }, flags: { maxBuildSizeKo: 1 }, name: 'not a website' },
  ],
})
