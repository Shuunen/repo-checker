import { invariant } from 'es-toolkit'
import { testRule } from '../../test/rule-tester.ts'
import { vitestConfigRules } from './vitest-config.rule.ts'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = vitestConfigRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

const vitest = { devDependencies: { vitest: '^4.0.0' } }
const happyDom = { devDependencies: { 'happy-dom': '^20.0.0', vitest: '^4.0.0' } }
const config = (test: string) => `import { defineConfig } from 'vitest/config'\n\nexport default defineConfig({\n  test: {\n${test}\n  },\n})\n`

testRule(byId('vitest-coverage-100'), {
  invalid: [
    { errors: ['missing'], files: { 'vitest.config.ts': config('    globals: true,') }, name: 'no coverage', output: config('    coverage: {\n      thresholds: { 100: true },\n    },\n    globals: true,'), pkg: vitest },
    { errors: ['missing'], files: { 'vite.config.ts': config("    coverage: { provider: 'v8' },") }, name: 'a coverage without thresholds, in the vite config', output: config("    coverage: {\n      provider: 'v8',\n      thresholds: {\n        100: true,\n      },\n    },"), pkg: vitest },
    { errors: ['missing'], files: { 'vitest.config.ts': config('    coverage: {\n      thresholds: {\n        lines: 90,\n      },\n    },') }, name: 'thresholds below 100, replaced', output: config('    coverage: {\n      thresholds: { 100: true },\n    },'), pkg: vitest },
    { errors: ['missing'], files: { 'vitest.config.ts': config('    coverage: { thresholds: { branches: 80 } },') }, name: 'inline thresholds, replaced', output: config('    coverage: { thresholds: { 100: true } },'), pkg: vitest },
  ],
  valid: [
    { files: { 'vitest.config.ts': config('    coverage: { thresholds: { 100: true } },') }, name: '100', pkg: vitest },
    { files: { 'vitest.config.ts': config("    coverage: {\n      thresholds: {\n        '100': true,\n      },\n    },") }, name: '100 quoted, on several lines', pkg: vitest },
    { files: { 'vitest.config.ts': config('') }, name: 'vitest not used', pkg: { name: 'app' } },
    { name: 'no config', pkg: vitest },
  ],
})

testRule(byId('vitest-globals'), {
  invalid: [{ errors: ['missing'], files: { 'vitest.config.ts': config("    pool: 'threads',") }, name: 'no globals', output: config("    globals: true,\n    pool: 'threads',"), pkg: vitest }],
  valid: [{ files: { 'vitest.config.ts': config('    globals: true,') }, name: 'globals', pkg: vitest }],
})

testRule(byId('vitest-reporter-dot'), {
  invalid: [
    { errors: ['missing'], files: { 'vitest.config.ts': config('    globals: true,') }, name: 'no reporter', output: config("    globals: true,\n    reporters: ['dot'],"), pkg: vitest },
    { errors: ['missing'], files: { 'vitest.config.ts': config("    reporters: ['minimal'],") }, name: 'minimal, replaced', output: config("    reporters: ['dot'],"), pkg: vitest },
  ],
  valid: [{ files: { 'vite.config.ts': config("    reporters: ['dot'],") }, name: 'dot', pkg: vitest }],
})

testRule(byId('vitest-silent'), {
  invalid: [{ errors: ['missing'], files: { 'vitest.config.ts': config("    pool: 'threads',") }, name: 'no silent, added at its sorted place', output: config("    pool: 'threads',\n    silent: true,"), pkg: vitest }],
  valid: [{ files: { 'vite.config.ts': config('    silent: true,') }, name: 'silent', pkg: vitest }],
})

testRule(byId('vitest-environment-happy-dom'), {
  invalid: [{ errors: ['missing'], files: { 'vitest.config.ts': config('    globals: true,') }, name: 'happy-dom installed but no environment', output: config("    environment: 'happy-dom',\n    globals: true,"), pkg: happyDom }],
  valid: [
    { files: { 'vitest.config.ts': config("    environment: 'happy-dom',") }, name: 'happy-dom', pkg: happyDom },
    { files: { 'vitest.config.ts': config("    environment: 'node',") }, name: 'node chosen on purpose', pkg: happyDom },
    { files: { 'vitest.config.ts': config('    globals: true,') }, name: 'no happy-dom', pkg: vitest },
  ],
})
