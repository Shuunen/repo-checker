import { testRule } from '../../engine/rule-tester.ts'
import { noEslintPluginPromise5 } from './no-eslint-plugin-promise-5.rule.ts'

testRule(noEslintPluginPromise5, {
  invalid: [
    { errors: ['found'], name: 'version 5', pkg: { devDependencies: { 'eslint-plugin-promise': '^5.1.0' } } },
    { errors: ['found'], name: 'exact version 5', pkg: { devDependencies: { 'eslint-plugin-promise': '5.1.0' } } },
  ],
  valid: [
    { name: 'version 6', pkg: { devDependencies: { 'eslint-plugin-promise': '^6.0.0' } } },
    { name: 'not used', pkg: { devDependencies: { eslint: '^9.0.0' } } },
  ],
})
