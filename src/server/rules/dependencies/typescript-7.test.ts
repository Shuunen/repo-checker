import { testRule } from '../../test/rule-tester.ts'
import { typescript7 } from './typescript-7.rule.ts'

const preview = '@typescript/native-preview'

testRule(typescript7, {
  invalid: [
    { errors: ['old'], installs: ['typescript'], name: 'typescript 6, no registry', output: { devDependencies: { typescript: '~7.0.2' } }, pkg: { devDependencies: { typescript: '~6.0.2' } }, remaining: 0 },
    {
      errors: ['old'],
      flags: { registry: { packages: { typescript: { latest: '7.1.0' } } } },
      installs: ['typescript'],
      name: 'the latest 7 of the registry',
      output: { devDependencies: { typescript: '~7.1.0' } },
      pkg: { devDependencies: { typescript: '^5.0.0' } },
      remaining: 0,
    },
    {
      errors: ['old'],
      flags: { registry: { packages: { typescript: { latest: '6.0.3' } } } },
      installs: ['typescript'],
      name: 'a registry that has no 7',
      output: { devDependencies: { typescript: '~7.0.2' } },
      pkg: { devDependencies: { typescript: '^5.0.0' } },
      remaining: 0,
    },
    { errors: ['old'], installs: ['typescript'], name: 'typescript in dependencies', output: { dependencies: { typescript: '~7.0.2' } }, pkg: { dependencies: { typescript: '^5.0.0' } }, remaining: 0 },
    { errors: ['preview'], name: 'the preview next to typescript 7', output: { devDependencies: { typescript: '~7.0.2' } }, pkg: { devDependencies: { [preview]: '7.0.0-dev.1', typescript: '~7.0.2' } } },
    { errors: ['preview'], name: 'the preview in dependencies', output: '{\n  "dependencies": {\n  },\n  "devDependencies": {\n    "typescript": "~7.0.2"\n  }\n}\n', pkg: { dependencies: { [preview]: '7.0.0-dev.1' }, devDependencies: { typescript: '~7.0.2' } } },
    { errors: ['preview'], installs: ['typescript'], name: 'the preview alone', output: { devDependencies: { typescript: '~7.0.2' } }, pkg: { devDependencies: { [preview]: '7.0.0-dev.1' } }, remaining: 0 },
  ],
  valid: [
    { name: 'typescript 7', pkg: { devDependencies: { typescript: '~7.0.2' } } },
    { name: 'a range that is not plain', pkg: { devDependencies: { typescript: 'latest' } } },
    { name: 'no typescript', pkg: { devDependencies: { vitest: '^4.0.0' } } },
  ],
})
