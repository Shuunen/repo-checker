import { invariant } from 'es-toolkit'
import { testRule } from '../../engine/rule-tester.ts'
import { requiredScriptRules } from './required.rule.ts'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = requiredScriptRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

testRule(byId('scripts-section'), { invalid: [{ errors: ['missing'], name: 'no scripts', pkg: { name: 'foo' } }], valid: [{ name: 'scripts', pkg: { scripts: {} } }] })
testRule(byId('scripts-check'), { invalid: [{ errors: ['missing'], name: 'no check', pkg: { scripts: { test: 'vitest' } } }], valid: [{ name: 'a check', pkg: { scripts: { check: 'pnpm test' } } }, { name: 'no package.json' }] })
testRule(byId('scripts-preversion'), {
  invalid: [
    { errors: ['missing'], name: 'no preversion, check exists', output: { scripts: { check: 'pnpm lint', preversion: 'pnpm check' } }, pkg: { scripts: { check: 'pnpm lint' } } },
    { errors: ['missing'], name: 'no preversion, no check to run', pkg: { scripts: {} } },
  ],
  valid: [
    { name: 'a preversion', pkg: { scripts: { preversion: 'pnpm check' } } },
    { name: 'a private package', pkg: { private: true, scripts: {} } },
  ],
})
testRule(byId('scripts-postversion'), {
  invalid: [{ errors: ['missing'], name: 'no postversion', output: { scripts: { postversion: 'git push && git push --tags' } }, pkg: { scripts: {} } }],
  valid: [
    { name: 'a postversion', pkg: { scripts: { postversion: 'git push' } } },
    { name: 'a private package', pkg: { private: true, scripts: {} } },
  ],
})

testRule(byId('scripts-depcruise'), {
  invalid: [{ errors: ['missing'], name: 'dependency-cruiser not run', pkg: { devDependencies: { 'dependency-cruiser': '^17.0.0' }, scripts: { lint: 'eslint' } } }],
  valid: [
    { name: 'depcruise run', pkg: { devDependencies: { 'dependency-cruiser': '^17.0.0' }, scripts: { lint: 'depcruise src --config' } } },
    { name: 'dependency-cruiser not used', pkg: { scripts: {} } },
  ],
})

testRule(byId('scripts-typescript-check'), {
  invalid: [{ errors: ['missing'], name: 'typescript without tsc', pkg: { devDependencies: { typescript: '^6.0.0' }, scripts: { build: 'vite build' } } }],
  valid: [
    { name: 'tsc --noEmit', pkg: { devDependencies: { typescript: '^6.0.0' }, scripts: { check: 'tsc --noEmit' } } },
    { name: 'no typescript', pkg: { scripts: { build: 'vite build' } } },
  ],
})

testRule(byId('scripts-unique-mark'), {
  invalid: [{ errors: ['missing'], name: 'shuutils and a build without mark', pkg: { dependencies: { shuutils: '^11.0.0' }, scripts: { build: 'vite build' } } }],
  valid: [
    { name: 'a mark task', pkg: { dependencies: { shuutils: '^11.0.0' }, scripts: { build: 'vite build', mark: 'unique-mark dist/index.js' } } },
    { files: { 'vite.config.ts': "import uniqueMark from 'unique-mark/vite'" }, name: 'a vite config using unique-mark', pkg: { dependencies: { shuutils: '^11.0.0' }, scripts: { build: 'vite build' } } },
    { name: 'shuutils without build', pkg: { dependencies: { shuutils: '^11.0.0' }, scripts: {} } },
  ],
})
