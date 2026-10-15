import { testRule } from '../../engine/rule-tester.ts'
import { packageDependenciesSections, packageJsonExists } from './package-json.rule.ts'

testRule(packageJsonExists, {
  invalid: [{ errors: ['missing'], files: { 'README.md': '# foo', 'src/app.ts': 'export {}' }, name: 'no package.json, but TypeScript files' }],
  valid: [
    { name: 'a package.json', pkg: { name: 'foo' } },
    { files: { 'index.html': '<p>hi</p>', 'style.css': 'p {}' }, name: 'no package.json, a static site' },
  ],
})

testRule(packageDependenciesSections, {
  invalid: [{ errors: ['missing'], name: 'no dependency section', pkg: { name: 'foo' } }],
  valid: [
    { name: 'dependencies', pkg: { dependencies: { zod: '^4.0.0' } } },
    { name: 'devDependencies', pkg: { devDependencies: { vitest: '^4.0.0' } } },
  ],
})
