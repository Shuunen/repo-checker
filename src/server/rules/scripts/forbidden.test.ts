import { invariant } from 'es-toolkit'
import { testRule } from '../../engine/rule-tester.ts'
import { forbiddenScriptRules } from './forbidden.rule.ts'

const bun = { devDependencies: { bun: '^1.0.0' } }
const eslint = { devDependencies: { eslint: '^9.0.0' } }

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = forbiddenScriptRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

testRule(byId('scripts-no-ci'), { invalid: [{ errors: ['found'], name: 'a ci script', pkg: { scripts: { ci: 'pnpm test' } } }], valid: [{ name: 'no ci script', pkg: { scripts: { check: 'pnpm test' } } }] })
testRule(byId('scripts-no-prepublish'), { invalid: [{ errors: ['found'], name: 'a prepublish script', pkg: { scripts: { prepublish: 'pnpm build' } } }], valid: [{ name: 'a prepare script', pkg: { scripts: { prepare: 'pnpm build' } } }] })
testRule(byId('scripts-no-npm-test'), { invalid: [{ errors: ['found'], name: 'npm test', pkg: { scripts: { check: 'npm test' } } }], valid: [{ name: 'pnpm test', pkg: { scripts: { check: 'pnpm test' } } }] })

testRule(byId('scripts-watchlist-eager'), {
  invalid: [{ errors: ['found'], name: 'watchlist without -eager', pkg: { scripts: { dev: 'watchlist src -- pnpm test' } } }],
  valid: [{ name: 'watchlist with -eager', pkg: { scripts: { dev: 'watchlist src -eager -- pnpm test' } } }],
})

testRule(byId('scripts-no-eslint-ignore-path'), {
  invalid: [{ errors: ['found'], name: 'eslint --ignore-path', pkg: { ...eslint, scripts: { lint: 'eslint --ignore-path .gitignore src' } } }],
  valid: [
    { name: 'eslint without it', pkg: { ...eslint, scripts: { lint: 'eslint src' } } },
    { name: 'eslint not used', pkg: { scripts: { lint: 'other --ignore-path x' } } },
  ],
})

testRule(byId('scripts-bun-install'), {
  invalid: [{ errors: ['found'], name: 'bun i', pkg: { ...bun, scripts: { setup: 'bun i' } } }],
  valid: [{ name: 'bun install', pkg: { ...bun, scripts: { setup: 'bun install' } } }],
})

testRule(byId('scripts-bun-no-misleading-test'), {
  invalid: [{ errors: ['found'], name: 'bun test in check', pkg: { ...bun, scripts: { check: 'bun test' } } }],
  valid: [
    { name: 'bun run test in check', pkg: { ...bun, scripts: { check: 'bun run test' } } },
    { name: 'bun test in test', pkg: { ...bun, scripts: { test: 'bun test' } } },
  ],
})

testRule(byId('scripts-bun-no-misleading-build'), {
  invalid: [{ errors: ['found', 'found'], name: 'bun build in check and postversion', pkg: { ...bun, scripts: { check: 'bun build', postversion: 'bun build && npm publish' } } }],
  valid: [{ name: 'bun build in build', pkg: { ...bun, scripts: { build: 'bun build src/index.ts' } } }],
})
