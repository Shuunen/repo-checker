import { testRule } from '../../test/rule-tester.ts'
import { oxfmtIgnoreGenerated, oxfmtIgnoreRedundant } from './oxfmt-ignore.rule.ts'

const pkg = { devDependencies: { oxfmt: '1.0.0' } }
const text = (value: unknown) => `${JSON.stringify(value, undefined, 2)}\n`
const json = (value: unknown) => ({ '.oxfmtrc.json': text(value) })

testRule(oxfmtIgnoreRedundant, {
  invalid: [{ errors: ['redundant', 'redundant'], files: { ...json({ ignorePatterns: ['**/dist', 'coverage/**', 'src/mocks/**'] }), '.gitignore': 'node_modules\n/dist/\ncoverage\n' }, name: 'folders already in .gitignore', output: text({ ignorePatterns: ['src/mocks/**'] }), pkg }],
  valid: [
    { files: { ...json({ ignorePatterns: ['src/mocks/**'] }), '.gitignore': 'dist\n' }, name: 'a pattern git does not ignore', pkg },
    { files: json({ ignorePatterns: ['dist'] }), name: 'no .gitignore', pkg },
    { files: { '.gitignore': 'dist\n' }, name: 'no oxfmt config', pkg },
    { files: { '.gitignore': 'dist\n', '.oxfmtrc.json': '' }, name: 'an empty oxfmt config', pkg },
    { files: { ...json({ ignorePatterns: ['dist'] }), '.gitignore': 'dist\n' }, name: 'oxfmt not used' },
  ],
})

testRule(oxfmtIgnoreGenerated, {
  invalid: [{ errors: ['generated', 'generated'], files: { ...json({}), 'src/__snapshots__/a.ts': 'a', 'src/lib/x.min.js': 'a', 'src/main.ts': 'a' }, name: 'snapshots and a minified file', output: text({ ignorePatterns: ['**/__snapshots__/**', '**/*.min.js'] }), pkg }],
  valid: [
    { files: { ...json({ ignorePatterns: ['**/__snapshots__/**', 'src/mocks/**'] }), 'src/__snapshots__/a.ts': 'a', 'src/mocks/b.ts': 'a' }, name: 'already ignored', pkg },
    { files: { ...json({}), 'src/main.ts': 'a' }, name: 'nothing generated', pkg },
    { files: { 'src/__snapshots__/a.ts': 'a' }, name: 'no oxfmt config', pkg },
    { files: { ...json({}), 'src/__snapshots__/a.ts': 'a' }, name: 'oxfmt not used' },
  ],
})
