import { invariant } from 'es-toolkit'
import { testRule } from '../../test/rule-tester.ts'
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

testRule(byId('renovate-config-exists'), {
  invalid: [{ errors: ['missing'], name: 'no renovate.json', output: '{\n  "$schema": "https://docs.renovatebot.com/renovate-schema.json",\n  "dependencyDashboard": false,\n  "extends": [\n    "config:semverAllMonthly",\n    ":automergeAll",\n    ":preserveSemverRanges"\n  ]\n}\n', pkg: {} }],
  valid: [{ files: good, name: 'a renovate.json' }],
})
testRule(byId('renovate-schema'), { invalid: [{ errors: ['missing'], files: { 'renovate.json': '{}' }, name: 'no schema', output: '{\n  "$schema": "https://docs.renovatebot.com/renovate-schema.json"\n}' }], valid: [{ files: good, name: 'the schema' }] })
testRule(byId('renovate-extends'), { invalid: [{ errors: ['missing'], files: { 'renovate.json': '{}' }, name: 'no extends' }], valid: [{ files: good, name: 'extends' }] })
testRule(byId('renovate-no-config-base'), { invalid: [{ errors: ['found'], files: { 'renovate.json': '{ "extends": ["config:base"] }' }, name: 'config:base', output: '{ "extends": ["config:semverAllMonthly"] }' }], valid: [{ files: good, name: 'semver monthly' }] })
testRule(byId('renovate-dashboard-off'), { invalid: [{ errors: ['missing'], files: { 'renovate.json': '{ "dependencyDashboard": true }' }, name: 'dashboard on' }], valid: [{ files: good, name: 'dashboard off' }] })
testRule(byId('renovate-semver-all-monthly'), {
  invalid: [
    { errors: ['missing'], files: { 'renovate.json': '{ "extends": ["config:recommended", ":automergeAll"] }' }, name: 'config:recommended', output: '{ "extends": ["config:semverAllMonthly", ":automergeAll"] }' },
    { errors: ['missing'], files: { 'renovate.json': '{ "extends": [":automergeAll"] }' }, name: 'no base preset', output: '{ "extends": ["config:semverAllMonthly", ":automergeAll"] }' },
  ],
  valid: [
    { files: { 'renovate.json': '{ "extends": ["config:semverAllMonthly", ":automergeAll"] }' }, name: 'semver all monthly' },
    { files: { 'renovate.json': '{}' }, name: 'no extends, renovate-extends reports it' },
  ],
})
testRule(byId('renovate-preserve-semver-ranges'), {
  invalid: [
    { errors: ['missing'], files: { 'renovate.json': '{ "extends": ["config:semverAllMonthly", ":automergeAll"] }' }, name: 'inline list', output: '{ "extends": ["config:semverAllMonthly", ":automergeAll", ":preserveSemverRanges"] }' },
    { errors: ['missing'], files: { 'renovate.json': '{\n  "extends": [\n    "config:semverAllMonthly"\n  ]\n}\n' }, name: 'one preset per line', output: '{\n  "extends": [\n    "config:semverAllMonthly",\n    ":preserveSemverRanges"\n  ]\n}\n' },
    { errors: ['missing'], files: { 'renovate.json': '{ "extends": [ "config:semverAllMonthly" ] }' }, name: 'inline list with spaces', output: '{ "extends": [ "config:semverAllMonthly", ":preserveSemverRanges" ] }' },
    { errors: ['missing'], files: { 'renovate.json': '{ "extends": [] }' }, name: 'empty list', output: '{ "extends": [":preserveSemverRanges"] }' },
  ],
  valid: [
    { files: { 'renovate.json': '{ "extends": ["config:semverAllMonthly", ":preserveSemverRanges"] }' }, name: 'the preset' },
    { files: { 'renovate.json': '{}' }, name: 'no extends, renovate-extends reports it' },
  ],
})
testRule(byId('renovate-no-duplicate-preset'), {
  invalid: [
    { errors: ['found'], files: { 'renovate.json': '{ "extends": ["config:semverAllMonthly", ":automergeAll", "config:semverAllMonthly"] }' }, name: 'inline duplicate', output: '{ "extends": ["config:semverAllMonthly", ":automergeAll"] }' },
    { errors: ['found'], files: { 'renovate.json': '{\n  "extends": [\n    "config:semverAllMonthly",\n    "config:semverAllMonthly"\n  ]\n}\n' }, name: 'duplicate per line', output: '{\n  "extends": [\n    "config:semverAllMonthly"\n  ]\n}\n' },
  ],
  valid: [
    { files: { 'renovate.json': '{ "extends": ["config:semverAllMonthly", ":automergeAll"] }' }, name: 'each preset once' },
    { files: { 'renovate.json': '{ "extends": ["config:semverAllMonthly", ":automergeAll", ":preserveSemverRanges"] }' }, name: 'three different presets' },
    { files: { 'renovate.json': '{}' }, name: 'no extends' },
    { name: 'no renovate.json' },
  ],
})
testRule(byId('renovate-automerge'), {
  invalid: [{ errors: ['missing'], files: { 'renovate.json': '{ "extends": [] }' }, name: 'no automerge' }],
  valid: [
    { files: good, name: 'automerge' },
    { files: { '.repo-checker.json': '{ "canAutoMergeDeps": false }', 'renovate.json': '{}' }, name: 'automerge not wanted' },
  ],
})
