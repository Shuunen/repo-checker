import { forbidFile, forbidInFile, requireFile, requireInFile, requireJsonSchema } from './file-rules.ts'
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
