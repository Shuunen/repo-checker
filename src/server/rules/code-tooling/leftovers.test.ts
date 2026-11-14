import { invariant } from 'es-toolkit'
import { testRule } from '../../test/rule-tester.ts'
import { leftoverChecks } from './leftovers.rule.ts'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = leftoverChecks.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

const oxlint = { devDependencies: { oxlint: '1.0.0' } }
const biome = { devDependencies: { '@biomejs/biome': '2.0.0' } }
const eslintPkg = { devDependencies: { eslint: '9.0.0' } }

testRule(byId('eslint-leftover-config'), {
  invalid: [{ errors: ['found', 'found'], files: { '.eslintignore': '', 'eslint.config.js': '' }, name: 'configs left' }],
  valid: [{ files: { 'eslint.config.js': '' }, name: 'eslint still used', pkg: eslintPkg }, { name: 'no config' }],
})

testRule(byId('biome-leftover-config'), {
  invalid: [{ errors: ['found'], files: { 'biome.json': '{}' }, name: 'a config left' }],
  valid: [{ files: { 'biome.json': '{}' }, name: 'biome still used', pkg: biome }, { name: 'no config' }],
})

const extensionsText = (...ids: string[]) => `${JSON.stringify({ recommendations: ids }, undefined, 2)}\n`
const extensions = (...ids: string[]) => ({ '.vscode/extensions.json': extensionsText(...ids) })

testRule(byId('eslint-leftover-extension'), {
  invalid: [
    { errors: ['found'], files: { '.vscode/extensions.json': '{"other":"dbaeumer.vscode-eslint"}\n' }, name: 'the extension outside the recommendations, not fixed' },
    { errors: ['found'], files: extensions('dbaeumer.vscode-eslint', 'oxc.oxc-vscode'), name: 'the extension is recommended', output: extensionsText('oxc.oxc-vscode') },
  ],
  valid: [{ files: extensions('dbaeumer.vscode-eslint'), name: 'eslint still used', pkg: eslintPkg }, { files: extensions('oxc.oxc-vscode'), name: 'not recommended' }, { name: 'no extensions file' }],
})

testRule(byId('biome-leftover-extension'), {
  invalid: [{ errors: ['found'], files: extensions('biomejs.biome'), name: 'the extension is recommended', output: extensionsText() }],
  valid: [{ files: extensions('biomejs.biome'), name: 'biome still used', pkg: biome }],
})

testRule(byId('eslint-leftover-comment'), {
  invalid: [
    { errors: ['found'], files: { 'src/a.ts': '// eslint-disable-next-line no-await-in-loop\nawait run()\n' }, name: 'a comment, no oxlint so no fix', pkg: { devDependencies: {} } },
    { errors: ['found'], files: { 'src/a.ts': '/* eslint-disable */\nrun()\n' }, name: 'a block comment renamed for oxlint', output: '/* oxlint-disable */\nrun()\n', pkg: oxlint },
    { errors: ['found'], files: { 'src/a.ts': "run() // eslint-disable-line no-console\nconst text = 'eslint-disable'\n" }, name: 'a trailing comment renamed, a string kept', output: "run() // oxlint-disable-line no-console\nconst text = 'eslint-disable'\n", pkg: oxlint },
  ],
  valid: [
    { files: { 'src/a.ts': '// eslint-disable-next-line no-await-in-loop\n' }, name: 'eslint still used', pkg: eslintPkg },
    { files: { 'src/a.test.ts': "const text = '// eslint-disable-next-line'\n" }, name: 'a string that mentions it' },
    { files: { 'src/a.d.ts': '/* eslint-disable */\n' }, name: 'a declaration file' },
    { files: { 'convex/_generated/api.js': '/* eslint-disable */\n' }, name: 'a generated folder' },
    { files: { 'src/old.vue.bak': '<!-- eslint-disable -->\n' }, name: 'not a source file' },
    { name: 'no comment' },
  ],
})

testRule(byId('biome-leftover-comment'), {
  invalid: [{ errors: ['found'], files: { 'src/a.ts': '// biome-ignore lint: disable\nrun()\n' }, name: 'a comment, no fix' }],
  valid: [{ files: { 'src/a.ts': '// biome-ignore lint: disable\n' }, name: 'biome still used', pkg: biome }],
})

testRule(byId('eslint-leftover-script'), {
  invalid: [
    { errors: ['found', 'found'], name: 'scripts that run eslint', pkg: { scripts: { lint: 'eslint . && echo ok', 'lint:fix': 'pnpm exec eslint --fix .' } } },
    { errors: ['found'], name: 'npx eslint', pkg: { scripts: { lint: 'npx eslint .' } } },
  ],
  valid: [
    { name: 'eslint still used', pkg: { devDependencies: { eslint: '9.0.0' }, scripts: { lint: 'eslint .' } } },
    { name: 'a script that only mentions it', pkg: { scripts: { 'eslint:clean': 'bun src/eslint-cleaner.cli.ts' } } },
    { name: 'no scripts', pkg: {} },
  ],
})

testRule(byId('biome-leftover-script'), {
  invalid: [{ errors: ['found'], name: 'a script that runs biome', pkg: { scripts: { lint: 'biome check .' } } }],
  valid: [{ name: 'biome still used', pkg: { ...biome, scripts: { lint: 'biome check .' } } }],
})

testRule(byId('eslint-leftover-gitignore'), {
  invalid: [{ errors: ['found'], files: { '.gitignore': 'dist\n.eslintcache\ncoverage\n' }, name: 'the cache is ignored', output: 'dist\ncoverage\n' }],
  valid: [{ files: { '.gitignore': '.eslintcache\n' }, name: 'eslint still used', pkg: eslintPkg }, { files: { '.gitignore': 'dist\n' }, name: 'nothing to remove' }, { name: 'no gitignore' }],
})
