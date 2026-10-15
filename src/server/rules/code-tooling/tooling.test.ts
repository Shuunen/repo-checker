import { invariant } from 'es-toolkit'
import { testRule } from '../../engine/rule-tester.ts'
import { dependencyToolChoice, toolingRules } from './tooling.rule.ts'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = toolingRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

const cruiser = { devDependencies: { 'dependency-cruiser': '^17.0.0' } }

testRule(dependencyToolChoice, {
  invalid: [{ errors: ['missing'], name: 'neither knip nor dependency-cruiser', pkg: { name: 'app' } }],
  valid: [
    { name: 'knip', pkg: { devDependencies: { knip: '^5.0.0' } } },
    { name: 'dependency-cruiser', pkg: cruiser },
  ],
})
testRule(byId('dependency-cruiser-config'), {
  invalid: [{ errors: ['missing'], name: 'no config', pkg: cruiser }],
  valid: [
    { files: { '.dependency-cruiser.cjs': '' }, name: 'a cjs config', pkg: cruiser },
    { name: 'knip wins', pkg: { devDependencies: { 'dependency-cruiser': '^17.0.0', knip: '^5.0.0' } } },
  ],
})
testRule(byId('tailwind-content'), {
  invalid: [{ errors: ['missing'], files: { 'tailwind.config.ts': 'export default {}' }, name: 'no content', pkg: { devDependencies: { tailwindcss: '^3.0.0' } } }],
  valid: [{ files: { 'tailwind.config.js': "module.exports = { content: ['./src/**/*.ts'] }" }, name: 'content', pkg: { devDependencies: { tailwindcss: '^3.0.0' } } }],
})
testRule(byId('repo-checker-config'), { invalid: [{ errors: ['missing'], name: 'no .repo-checker.json', output: '{\n  "$schema": "./node_modules/repo-check/schema.json"\n}\n' }], valid: [{ files: { '.repo-checker.json': '{}' }, name: 'a .repo-checker.json' }] })
