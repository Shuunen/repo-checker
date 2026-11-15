import { testRule } from '../../test/rule-tester.ts'
import { testFileColocated, testNoSpecFiles, testNoToBeInTheDocument, testNoVitestGlobalsImport } from './test-files.rule.ts'

const globals = { 'vitest.config.ts': 'export default { test: { globals: true } }' }

testRule(testNoSpecFiles, {
  invalid: [{ errors: ['found', 'found'], files: { 'e2e/b.spec.ts': '', 'src/a.spec.tsx': '', 'src/c.test.ts': '' }, name: 'two spec files' }],
  valid: [{ files: { 'src/a.test.ts': '' }, name: 'test files' }, { files: { 'src/a.spec.ts.md': '' }, name: 'not a spec file' }, { name: 'no tests' }],
})

testRule(testNoVitestGlobalsImport, {
  invalid: [
    { errors: ['found'], files: { ...globals, 'src/a.test.ts': "import { describe, expect, it } from 'vitest'\n\ndescribe('a', () => {})\n" }, name: 'only globals imported', output: "\ndescribe('a', () => {})\n" },
    { errors: ['found'], files: { ...globals, 'src/a.test.ts': "import { describe, vi } from 'vitest'\nvi.fn()\n" }, name: 'a global and vi', output: "import { vi } from 'vitest'\nvi.fn()\n" },
    { errors: ['found', 'found'], files: { ...globals, 'src/a.test.ts': "import { it } from 'vitest'\n", 'src/b.test.ts': "import { expect, vi } from 'vitest';\n" }, name: 'two files', output: ['', "import { vi } from 'vitest'\n"] },
  ],
  valid: [
    { files: { ...globals, 'src/a.test.ts': "import { vi } from 'vitest'\n" }, name: 'only vi imported' },
    { files: { ...globals, 'src/a.test.ts': "import type { Mock } from 'vitest'\n" }, name: 'a type import' },
    { files: { 'src/a.test.ts': "import { describe } from 'vitest'\n" }, name: 'globals are not on, the import is needed' },
    { files: { ...globals, 'src/a.ts': "import { describe } from 'vitest'\n" }, name: 'not a test file' },
  ],
})

testRule(testNoToBeInTheDocument, {
  invalid: [
    { errors: ['found'], files: { 'src/a.test.tsx': '  expect(el).toBeInTheDocument()' }, name: 'toBeInTheDocument' },
    { errors: ['found'], files: { 'src/a.test.tsx': '  expect(\n    el,\n  ).not.toBeInTheDocument()' }, name: 'a multiline assertion with not' },
  ],
  valid: [
    { files: { 'src/a.test.tsx': 'expect(el).toBeDefined()' }, name: 'getByTestId style' },
    { files: { 'src/a.test.tsx': "const text = 'expect(el).toBeInTheDocument()'" }, name: 'a mention in a string' },
  ],
})

testRule(testFileColocated, {
  invalid: [
    { errors: ['orphan'], files: { 'src/tests/format.test.ts': '', 'src/utils/other.ts': '' }, name: 'a test in a separate folder' },
    { errors: ['orphan', 'orphan'], files: { 'src/a.test.ts': '', 'src/b.test.tsx': '' }, name: 'two orphan tests' },
    { errors: ['orphan'], files: { 'src/a.d.ts': '', 'src/a.spec.ts': '', 'src/a.test.ts': '', 'src/a/index.ts': '' }, name: 'only a type file, a spec and a folder of the same name' },
  ],
  valid: [
    { files: { 'src/format.test.ts': '', 'src/format.ts': '' }, name: 'a source next to the test' },
    { files: { 'src/button.test.tsx': '', 'src/button.tsx': '' }, name: 'a tsx source' },
    { files: { 'src/stale.rule.ts': '', 'src/stale.test.ts': '' }, name: 'a source with a kind, like .rule' },
    { files: { 'src/utils.dom.test.ts': '', 'src/utils.dom.ts': '' }, name: 'a dotted source name' },
    { files: { 'src/app.test.ts': '' }, name: 'the app as a whole' },
    { files: { 'src/home.integration.test.ts': '' }, name: 'an integration test' },
    { files: { 'src/home.e2e.test.ts': '' }, name: 'an end to end test' },
    { files: { 'src/test-utils/render.test.ts': '' }, name: 'a test utils folder' },
    { files: { 'e2e/home.test.ts': '' }, name: 'a test outside src' },
    { files: { 'src/a.spec.ts': '' }, name: 'a spec file, left to its own check' },
    { name: 'no tests' },
  ],
})
