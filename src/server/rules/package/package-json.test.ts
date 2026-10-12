import { testRule } from '../../engine/rule-tester.ts'
import { packageDependenciesSections, packageJsonExists } from './package-json.rule.ts'

testRule(packageJsonExists, {
  invalid: [{ errors: ['missing'], files: { 'README.md': '# foo' }, name: 'no package.json' }],
  valid: [{ name: 'a package.json', pkg: { name: 'foo' } }],
})

testRule(packageDependenciesSections, {
  invalid: [{ errors: ['missing'], name: 'no dependency section', pkg: { name: 'foo' } }],
  valid: [
    { name: 'dependencies', pkg: { dependencies: { zod: '^4.0.0' } } },
    { name: 'devDependencies', pkg: { devDependencies: { vitest: '^4.0.0' } } },
  ],
})
