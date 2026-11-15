import { testRule } from '../../test/rule-tester.ts'
import { testNoOnly } from './test-only.rule.ts'

testRule(testNoOnly, {
  invalid: [
    { errors: ['found'], files: { 'src/a.test.ts': "it.only('a', () => {})\nit('b', () => {})\n" }, name: 'an it.only', output: "it('a', () => {})\nit('b', () => {})\n" },
    {
      errors: ['found', 'found'],
      files: { 'e2e/b.spec.ts': "test.only('a', () => {})", 'src/a.test.tsx': "describe.only('a', () => {})\nit.concurrent.only('b', () => {})" },
      name: 'several files and variants',
      output: ["test('a', () => {})", "describe('a', () => {})\nit.concurrent('b', () => {})"],
    },
  ],
  valid: [{ files: { 'src/a.test.ts': "it('a', () => {})" }, name: 'no focus' }, { files: { 'src/a.ts': "it.only('a')" }, name: 'not a test file' }, { name: 'no tests' }],
})
