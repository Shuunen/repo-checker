import { invariant } from 'es-toolkit'
import { testRule } from '../../engine/rule-tester.ts'
import { renovateRules } from './renovate.rule.ts'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = renovateRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

const good = { 'renovate.json': '{ "$schema": "https://docs.renovatebot.com/renovate-schema.json", "extends": ["config:semverAllMonthly", ":automergeAll"], "dependencyDashboard": false }' }

testRule(byId('renovate-config-exists'), { invalid: [{ errors: ['missing'], name: 'no renovate.json' }], valid: [{ files: good, name: 'a renovate.json' }] })
testRule(byId('renovate-schema'), { invalid: [{ errors: ['missing'], files: { 'renovate.json': '{}' }, name: 'no schema', output: '{\n  "$schema": "https://docs.renovatebot.com/renovate-schema.json"\n}' }], valid: [{ files: good, name: 'the schema' }] })
testRule(byId('renovate-extends'), { invalid: [{ errors: ['missing'], files: { 'renovate.json': '{}' }, name: 'no extends' }], valid: [{ files: good, name: 'extends' }] })
testRule(byId('renovate-no-config-base'), { invalid: [{ errors: ['found'], files: { 'renovate.json': '{ "extends": ["config:base"] }' }, name: 'config:base' }], valid: [{ files: good, name: 'semver monthly' }] })
testRule(byId('renovate-dashboard-off'), { invalid: [{ errors: ['missing'], files: { 'renovate.json': '{ "dependencyDashboard": true }' }, name: 'dashboard on' }], valid: [{ files: good, name: 'dashboard off' }] })
testRule(byId('renovate-automerge'), {
  invalid: [{ errors: ['missing'], files: { 'renovate.json': '{ "extends": [] }' }, name: 'no automerge' }],
  valid: [
    { files: good, name: 'automerge' },
    { files: { '.repo-checker.json': '{ "canAutoMergeDeps": false }', 'renovate.json': '{}' }, name: 'automerge not wanted' },
  ],
})
