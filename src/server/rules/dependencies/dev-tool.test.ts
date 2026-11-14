import { testRule } from '../../test/rule-tester.ts'
import { devToolInDependencies } from './dev-tool.rule.ts'

testRule(devToolInDependencies, {
  invalid: [
    { errors: ['found'], name: 'a tool next to a real dependency, no devDependencies yet', output: { dependencies: { zod: '4.0.0' }, devDependencies: { tailwindcss: '4.0.0' } }, pkg: { dependencies: { tailwindcss: '4.0.0', zod: '4.0.0' } } },
    { errors: ['found'], name: 'the only dependency, the section goes away', output: { devDependencies: { '@types/bun': '1.0.0' } }, pkg: { dependencies: { '@types/bun': '1.0.0' } } },
    {
      errors: ['found', 'found'],
      name: 'two tools, devDependencies kept sorted',
      output: { dependencies: { zod: '4.0.0' }, devDependencies: { '@tailwindcss/vite': '4.0.0', tailwindcss: '4.0.0', vitest: '4.0.0' } },
      pkg: { dependencies: { '@tailwindcss/vite': '4.0.0', tailwindcss: '4.0.0', zod: '4.0.0' }, devDependencies: { vitest: '4.0.0' } },
    },
    { errors: ['found'], name: 'already in devDependencies, its version is kept', output: { dependencies: { zod: '4.0.0' }, devDependencies: { vite: '7.0.0' } }, pkg: { dependencies: { vite: '6.0.0', zod: '4.0.0' }, devDependencies: { vite: '7.0.0' } } },
  ],
  valid: [
    { name: 'in devDependencies', pkg: { dependencies: { zod: '4.0.0' }, devDependencies: { typescript: '7.0.0' } } },
    { name: 'no dependencies', pkg: { devDependencies: { typescript: '7.0.0' } } },
    { flags: { isPublishedPackage: true }, name: 'a published package may need them', pkg: { dependencies: { '@types/node': '24.0.0' } } },
    { name: 'no package.json' },
  ],
})
