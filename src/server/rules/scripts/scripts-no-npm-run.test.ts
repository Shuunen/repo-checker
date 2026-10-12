import { testRule } from '../../engine/rule-tester.ts'
import { scriptsNoNpmRun } from './scripts-no-npm-run.rule.ts'

testRule(scriptsNoNpmRun, {
  invalid: [
    { errors: ['found'], name: 'one script', output: { scripts: { check: 'pnpm lint && pnpm test' } }, pkg: { scripts: { check: 'npm run lint && npm run test' } } },
    { errors: ['found', 'found'], name: 'two scripts', output: { scripts: { dev: 'pnpm build', test: 'pnpm vitest -w' } }, pkg: { scripts: { dev: 'npm run build', test: 'npm run vitest -- -w' } } },
  ],
  valid: [
    { name: 'pnpm scripts', pkg: { scripts: { check: 'pnpm lint' } } },
    { name: 'no scripts', pkg: { name: 'foo' } },
  ],
})
