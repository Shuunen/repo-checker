import { testRule } from '../../engine/rule-tester.ts'
import { coverageDependency, unitTestingDependency, uvuAssert } from './testing-tools.rule.ts'

const uvu = { devDependencies: { uvu: '^0.5.0' } }

testRule(unitTestingDependency, {
  invalid: [{ errors: ['missing'], name: 'no testing tool', pkg: { devDependencies: { typescript: '^6.0.0' } } }],
  valid: [
    { name: 'vitest', pkg: { devDependencies: { vitest: '^4.0.0' } } },
    { name: 'bun test', pkg: { dependencies: { zod: '^4.0.0' }, scripts: { test: 'bun test' } } },
    { name: 'no dependency section', pkg: { name: 'foo' } },
  ],
})

testRule(coverageDependency, {
  invalid: [{ errors: ['missing'], name: 'no coverage tool', pkg: { devDependencies: { vitest: '^4.0.0' } } }],
  valid: [
    { name: 'v8 coverage', pkg: { devDependencies: { '@vitest/coverage-v8': '^4.0.0' } } },
    { name: 'bun test --coverage', pkg: { devDependencies: { bun: '^1.0.0' }, scripts: { test: 'bun test --coverage' } } },
  ],
})

testRule(uvuAssert, {
  invalid: [{ errors: ['found'], files: { 'tests/a.test.js': "import { equal } from 'assert'\n" }, name: 'assert in tests', pkg: uvu }],
  valid: [
    { files: { 'src/a.js': "import { equal } from 'assert'\n", 'tests/a.test.js': "import { equal } from 'uvu/assert'\n" }, name: 'uvu/assert in tests, assert outside', pkg: uvu },
    { name: 'uvu not used', pkg: { devDependencies: { vitest: '^4.0.0' } } },
  ],
})
