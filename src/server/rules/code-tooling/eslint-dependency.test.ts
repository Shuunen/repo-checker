import { testRule } from '../../engine/rule-tester.ts'
import { eslintDependency } from './eslint-dependency.rule.ts'

testRule(eslintDependency, {
  invalid: [
    { errors: ['outdated'], name: 'eslint 8', pkg: { devDependencies: { eslint: '^8.57.0' } } },
    { errors: ['missing'], name: 'eslint plugins without eslint', pkg: { devDependencies: { 'eslint-plugin-unicorn': '^60.0.0' } } },
  ],
  valid: [
    { name: 'eslint 9', pkg: { devDependencies: { eslint: '^9.0.0' } } },
    { name: 'eslint not used', pkg: { devDependencies: { oxlint: '^1.0.0' } } },
  ],
})
