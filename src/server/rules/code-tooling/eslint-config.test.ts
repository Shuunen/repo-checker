import { invariant } from 'es-toolkit'
import { testRule } from '../../engine/rule-tester.ts'
import { eslintConfigRules } from './eslint-config.rule.ts'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = eslintConfigRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

const eslint = { devDependencies: { eslint: '^9.0.0' } }
const tailwind = { devDependencies: { eslint: '^9.0.0', tailwindcss: '^4.0.0' } }

testRule(byId('eslint-config-exists'), {
  invalid: [{ errors: ['missing'], files: { '.eslintrc.json': '{}' }, name: 'no flat config', pkg: eslint }],
  valid: [
    { files: { 'eslint.config.mjs': 'export default []' }, name: 'a flat config', pkg: eslint },
    { name: 'eslint not used', pkg: { name: 'app' } },
  ],
})
testRule(byId('eslint-no-deprecated-config'), { invalid: [{ errors: ['found'], files: { '.eslintrc.js': '' }, name: 'an .eslintrc.js', pkg: eslint }], valid: [{ files: { 'eslint.config.js': '' }, name: 'only the flat config', pkg: eslint }] })
testRule(byId('eslint-no-xo-config'), { invalid: [{ errors: ['found'], files: { 'xo.config.js': '' }, name: 'an xo config', pkg: eslint }], valid: [{ name: 'no xo config', pkg: eslint }] })
testRule(byId('eslint-browser-config'), {
  invalid: [{ errors: ['missing'], files: { 'eslint.config.js': 'export default []' }, name: 'tailwind without browser', pkg: tailwind }],
  valid: [
    { files: { 'eslint.config.js': 'import globals from "globals"; globals.browser' }, name: 'tailwind with browser', pkg: tailwind },
    { files: { 'eslint.config.js': 'export default []' }, name: 'no tailwind', pkg: eslint },
  ],
})
