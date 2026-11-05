import { forbidFile, forbidInFile, requireFile, requireInFile, requireJsonSchema, requireJsonValues } from './file-rules.ts'
import { testRule } from './rule-tester.ts'

testRule(requireFile({ files: ['a.txt', 'b.txt'], id: 'test-require-file', message: 'no {{file}}', severity: 'error', when: ({ flags }) => flags.isCli !== true }), {
  invalid: [{ errors: ['missing'], name: 'none of the files' }],
  valid: [
    { files: { 'b.txt': '' }, name: 'the second candidate' },
    { flags: { isCli: true }, name: 'condition false, skipped' },
  ],
})

testRule(requireFile({ files: ({ flags }) => (flags.isModule === true ? ['esm.js'] : ['cjs.cjs']), id: 'test-require-file-by-context', message: 'no {{file}}', severity: 'error' }), {
  invalid: [{ errors: ['missing'], files: { 'cjs.cjs': '' }, flags: { isModule: true }, name: 'the esm file is missing for an esm project' }],
  valid: [{ files: { 'cjs.cjs': '' }, name: 'the cjs file of a cjs project' }],
})

testRule(forbidFile({ files: ['old.json', 'old.js'], id: 'test-forbid-file', message: '{{file}} is old', severity: 'warning' }), {
  invalid: [{ errors: ['found', 'found'], files: { 'old.js': '', 'old.json': '' }, name: 'both old files' }],
  valid: [{ files: { 'new.json': '' }, name: 'no old file' }],
})

testRule(requireInFile({ files: ['.npmrc'], fix: text => `${text}b=2\n`, id: 'test-require-in-file', message: '{{file}} lacks b', pattern: /b=2/u, severity: 'warning' }), {
  invalid: [{ errors: ['missing'], files: { '.npmrc': 'a=1\n' }, name: 'missing line, appended', output: 'a=1\nb=2\n' }],
  valid: [{ files: { '.npmrc': 'b=2\n' }, name: 'the line is there' }, { name: 'no file, skipped' }],
})

testRule(requireInFile({ files: ['.gitignore'], id: 'test-require-in-file-no-fix', message: '{{file}} lacks dist', pattern: /dist/u, severity: 'warning', when: ({ flags }) => flags.isCli !== true }), {
  invalid: [{ errors: ['missing'], files: { '.gitignore': 'node_modules' }, name: 'missing, no fix' }],
  valid: [{ files: { '.gitignore': 'node_modules' }, flags: { isCli: true }, name: 'condition false, skipped' }],
})

testRule(forbidInFile({ files: ['.gitignore'], id: 'test-forbid-in-file', message: '{{file}} has the lock', pattern: /lock/u, severity: 'warning' }), {
  invalid: [{ errors: ['found'], files: { '.gitignore': 'pnpm-lock.yaml' }, name: 'the pattern is there' }],
  valid: [{ files: { '.gitignore': 'node_modules' }, name: 'the pattern is not there' }],
})

testRule(requireJsonSchema({ files: ['conf.json'], id: 'test-json-schema', schema: 'https://example.com/schema.json', severity: 'warning' }), {
  invalid: [
    { errors: ['missing'], files: { 'conf.json': '{\n  "a": 1\n}\n' }, name: 'no schema, added first', output: '{\n  "$schema": "https://example.com/schema.json",\n  "a": 1\n}\n' },
    { errors: ['missing'], files: { 'conf.json': '' }, name: 'an empty file, filled', output: '{\n  "$schema": "https://example.com/schema.json"\n}' },
  ],
  valid: [{ files: { 'conf.json': '{ "$schema": "https://example.com/schema.json" }' }, name: 'the schema' }],
})

testRule(requireInFile({ files: ['ci.yml'], id: 'test-only-if', message: '{{file}} pins no version', onlyIf: /setup-pnpm/u, pattern: /version: 12/u, severity: 'warning' }), {
  invalid: [{ errors: ['missing'], files: { 'ci.yml': 'uses: setup-pnpm\n' }, name: 'the step without the version' }],
  valid: [
    { files: { 'ci.yml': 'uses: setup-bun\n' }, name: 'no such step, skipped' },
    { files: { 'ci.yml': 'uses: setup-pnpm\nversion: 12\n' }, name: 'the step with the version' },
  ],
})

testRule(forbidInFile({ files: ['ci.yml'], fix: text => text.replace(' --flag', ''), id: 'test-forbid-fix', message: '{{file}} has the flag', pattern: /--flag/u, severity: 'error' }), {
  invalid: [{ errors: ['found'], files: { 'ci.yml': 'run: install --flag\n' }, name: 'the flag, removed', output: 'run: install\n' }],
  valid: [{ files: { 'ci.yml': 'run: install\n' }, name: 'no flag' }],
})

testRule(
  requireJsonValues({
    files: ['conf.json'],
    id: 'test-json-values',
    section: 'formatter',
    severity: 'warning',
    values: [
      { expected: 2, path: ['formatter', 'indent'] },
      { expected: 120, isValid: current => typeof current === 'number' && current > 80, path: ['formatter', 'width'] },
      { expected: 'all', path: ['formatter', 'react'], when: ({ flags }) => flags.isCli === true },
    ],
  }),
  {
    invalid: [{ errors: ['wrong', 'wrong'], files: { 'conf.json': '{\n  "formatter": {\n    "indent": 4,\n    "width": 80\n  }\n}\n' }, name: 'two wrong values, fixed', output: '{\n  "formatter": {\n    "indent": 2,\n    "width": 120\n  }\n}\n' }],
    valid: [
      { files: { 'conf.json': '{ "formatter": { "indent": 2, "width": 300 } }' }, name: 'the expected values, the conditional one skipped' },
      { files: { 'conf.json': '{ "linter": {} }' }, name: 'no formatter section, skipped' },
      { files: { 'conf.json': '' }, name: 'an empty file, skipped' },
      { name: 'no file, skipped' },
    ],
  },
)

testRule(requireJsonValues({ files: ['conf.json'], id: 'test-json-values-no-section', severity: 'warning', values: [{ expected: true, path: ['enabled'] }] }), {
  invalid: [{ errors: ['wrong'], files: { 'conf.json': '{}' }, name: 'missing, added', output: '{\n  "enabled": true\n}' }],
  valid: [{ files: { 'conf.json': '{ "enabled": true }' }, name: 'enabled' }],
})
