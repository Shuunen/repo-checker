import { invariant } from 'es-toolkit'
import { testRule } from '../../test/rule-tester.ts'
import { gitignoreBaselineRules } from './gitignore-baseline.rule.ts'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = gitignoreBaselineRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

testRule(byId('gitignore-dist'), {
  invalid: [{ errors: ['missing'], files: { '.gitignore': 'node_modules' }, name: 'a build script, dist not ignored', output: 'dist\nnode_modules\n', pkg: { scripts: { build: 'vite build' } } }],
  valid: [
    { files: { '.gitignore': 'dist\nnode_modules' }, name: 'dist ignored', pkg: { scripts: { build: 'vite build' } } },
    { files: { '.gitignore': '/build/\nnode_modules' }, name: 'build ignored', pkg: { scripts: { build: 'vite build' } } },
    { files: { '.gitignore': 'node_modules' }, name: 'no build script', pkg: {} },
    { name: 'no .gitignore, gitignore-exists reports it', pkg: { scripts: { build: 'vite build' } } },
  ],
})

testRule(byId('gitignore-coverage'), {
  invalid: [
    { errors: ['missing'], files: { '.gitignore': 'node_modules' }, name: 'a coverage script', output: 'coverage\nnode_modules\n', pkg: { scripts: { 'test:unit': 'vitest run --coverage' } } },
    { errors: ['missing'], files: { '.gitignore': 'node_modules' }, name: 'a coverage dependency', output: 'coverage\nnode_modules\n', pkg: { devDependencies: { '@vitest/coverage-v8': '4.0.0' } } },
    { errors: ['missing'], files: { '.gitignore': 'node_modules' }, name: 'c8', output: 'coverage\nnode_modules\n', pkg: { devDependencies: { c8: '10.0.0' } } },
    { errors: ['missing'], files: { '.gitignore': 'node_modules' }, name: 'nyc', output: 'coverage\nnode_modules\n', pkg: { devDependencies: { nyc: '17.0.0' } } },
  ],
  valid: [
    { files: { '.gitignore': 'coverage\nnode_modules' }, name: 'coverage ignored', pkg: { scripts: { test: 'vitest run --coverage' } } },
    { files: { '.gitignore': 'node_modules' }, name: 'no coverage', pkg: { scripts: { test: 'vitest run' } } },
    { files: { '.gitignore': 'node_modules' }, name: 'no scripts at all', pkg: {} },
  ],
})

testRule(byId('gitignore-env'), {
  invalid: [{ errors: ['missing'], files: { '.env': 'KEY=1', '.gitignore': 'node_modules' }, name: 'a .env file not ignored', output: '.env\nnode_modules\n' }],
  valid: [
    { files: { '.env': 'KEY=1', '.gitignore': '.env\nnode_modules' }, name: '.env ignored' },
    { files: { '.env': 'KEY=1', '.gitignore': '.env*\nnode_modules' }, name: '.env* ignored' },
    { files: { '.gitignore': 'node_modules' }, name: 'no .env file' },
  ],
})

testRule(byId('gitignore-tsbuildinfo'), {
  invalid: [
    { errors: ['missing'], files: { '.gitignore': 'node_modules', 'tsconfig.node.json': '{ "compilerOptions": { "composite": true } }' }, flags: { isUsingTypescript: true }, name: 'a composite tsconfig', output: '*.tsbuildinfo\nnode_modules\n', pkg: {} },
    { errors: ['missing'], files: { '.gitignore': 'node_modules' }, flags: { isUsingTypescript: true }, name: 'tsc --build', output: '*.tsbuildinfo\nnode_modules\n', pkg: { scripts: { build: 'tsc --build' } } },
  ],
  valid: [
    { files: { '.gitignore': 'node_modules\ntsconfig.tsbuildinfo', 'tsconfig.json': '{ "compilerOptions": { "incremental": true } }' }, flags: { isUsingTypescript: true }, name: 'ignored', pkg: {} },
    { files: { '.gitignore': 'node_modules', 'tsconfig.json': '{ "compilerOptions": { "strict": true } }' }, flags: { isUsingTypescript: true }, name: 'no incremental build', pkg: {} },
    { files: { '.gitignore': 'node_modules', 'tsconfig.json': '{ "compilerOptions": { "incremental": true } }' }, name: 'not a TypeScript project', pkg: {} },
    { files: { '.gitignore': 'node_modules', 'tsconfig.json': '{ "compilerOptions": { "incremental": true } }' }, flags: { isUsingTypescript: true }, name: 'no package.json' },
  ],
})

testRule(byId('gitignore-playwright-results'), {
  invalid: [{ errors: ['missing'], files: { '.gitignore': 'node_modules' }, name: 'playwright, no test-results', output: 'node_modules\ntest-results\n', pkg: { devDependencies: { '@playwright/test': '1.0.0' } } }],
  valid: [
    { files: { '.gitignore': 'test-results\nnode_modules' }, name: 'ignored', pkg: { devDependencies: { '@playwright/test': '1.0.0' } } },
    { files: { '.gitignore': 'node_modules' }, name: 'no playwright', pkg: {} },
  ],
})

testRule(byId('gitignore-playwright-report'), {
  invalid: [{ errors: ['missing'], files: { '.gitignore': 'node_modules' }, name: 'playwright, no report', output: 'node_modules\nplaywright-report\n', pkg: { devDependencies: { '@playwright/test': '1.0.0' } } }],
  valid: [{ files: { '.gitignore': '/playwright-report/\nnode_modules' }, name: 'ignored', pkg: { devDependencies: { '@playwright/test': '1.0.0' } } }],
})
