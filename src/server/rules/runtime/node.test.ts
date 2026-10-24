import { invariant } from 'es-toolkit'
import { testRule } from '../../engine/rule-tester.ts'
import { nodeVersionRules, npmrcRules } from './node.rule.ts'

/**
 * Get a rule of both tables
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = [...nodeVersionRules, ...npmrcRules].find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the tables`)
  return rule
}

testRule(byId('nvmrc-exists'), {
  invalid: [
    { errors: ['missing'], flags: { isNotNode: false }, name: 'no .nvmrc', output: '24.21.0\n' },
    { errors: ['missing'], flags: { isNotNode: false, nodeVersion: '24.99.1' }, name: 'no .nvmrc, the latest LTS', output: '24.99.1\n' },
  ],
  valid: [{ files: { '.nvmrc': '24.11.0' }, name: 'a .nvmrc' }, { name: 'not a Node project' }],
})
testRule(byId('nvmrc-recent-node'), { invalid: [{ errors: ['missing'], files: { '.nvmrc': '20.1.0' }, name: 'node 20' }], valid: [{ files: { '.nvmrc': '24.11.0\n' }, name: 'node 24' }] })
testRule(byId('npmrc-exists'), {
  invalid: [{ errors: ['missing'], flags: { isNotNode: false }, name: 'no .npmrc', output: 'enable-pre-post-scripts=true\n', pkg: { name: 'foo' } }],
  valid: [
    { files: { '.npmrc': '' }, name: 'a .npmrc', pkg: { name: 'foo' } },
    { flags: { isNotNode: true }, name: 'not a Node project', pkg: { name: 'foo' } },
    { name: 'a private package', pkg: { private: true } },
    { name: 'pnpm 12', pkg: { name: 'foo', packageManager: 'pnpm@12.0.0' } },
    { name: 'no package.json' },
  ],
})
testRule(byId('npmrc-pre-post-scripts'), {
  invalid: [{ errors: ['missing'], files: { '.npmrc': 'save-exact=true\n' }, name: 'pre scripts without the option, added', output: 'save-exact=true\nenable-pre-post-scripts=true\n', pkg: { scripts: { preversion: 'pnpm check' } } }],
  valid: [
    { files: { '.npmrc': 'enable-pre-post-scripts=true' }, name: 'the option', pkg: { scripts: { postversion: 'git push' } } },
    { files: { '.npmrc': '' }, name: 'no pre or post script', pkg: { scripts: { prepare: 'husky', test: 'vitest' } } },
  ],
})
