import { invariant } from 'es-toolkit'
import { testRule } from '../../engine/rule-tester.ts'
import { workflowRules } from './workflow.rule.ts'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = workflowRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

const ci = (text: string) => ({ '.github/workflows/ci.yml': text })
const pnpmCi = ci(
  'on:\n  push:\n    branches:\n      - master\njobs:\n  check:\n    steps:\n      - uses: actions/checkout@v7\n      - uses: pnpm/action-setup@v6.1.0\n        with:\n          version: 12\n      - uses: actions/setup-node@v6\n        with:\n          node-version: 26\n      - run: pnpm install\n',
)
const bunCi = ci('jobs:\n  check:\n    steps:\n      - uses: actions/checkout@v7\n      - uses: oven-sh/setup-bun@v2\n      - uses: actions/setup-node@v6\n        with:\n          node-version: 26\n      - run: bun run check\n')
const bunPkg = { packageManager: 'bun@1.4.2' }
const pnpmPkg = { devDependencies: { bun: '^1.4.2' }, packageManager: 'pnpm@12.8.1' }

testRule(byId('ci-checkout-step'), { invalid: [{ errors: ['missing'], files: ci('jobs: {}\n'), name: 'no checkout' }], valid: [{ files: pnpmCi, name: 'a checkout' }, { name: 'no workflow, skipped' }] })
testRule(byId('ci-checkout-version'), {
  invalid: [{ errors: ['missing'], files: ci('      - uses: actions/checkout@v4\n'), name: 'checkout v4' }],
  valid: [
    { files: pnpmCi, name: 'checkout v7' },
    { files: ci('      - uses: actions/checkout@v12\n'), name: 'checkout v12' },
    { files: ci('jobs: {}\n'), name: 'no checkout, ci-checkout-step reports it' },
  ],
})
testRule(byId('ci-node-step'), { invalid: [{ errors: ['missing'], files: ci('jobs: {}\n'), name: 'no setup-node' }], valid: [{ files: pnpmCi, name: 'setup-node' }] })
testRule(byId('ci-node-version'), {
  invalid: [{ errors: ['missing'], files: ci('node-version: 20\n'), name: 'node 20' }],
  valid: [
    { files: pnpmCi, name: 'node 26' },
    { files: ci('node: [26]\n'), name: 'node 26 in a matrix' },
  ],
})
testRule(byId('ci-no-main-branch'), { invalid: [{ errors: ['found'], files: ci('branches:\n  - main\n'), name: 'a main branch' }], valid: [{ files: pnpmCi, name: 'master only' }] })
testRule(byId('ci-pnpm-step'), {
  invalid: [{ errors: ['missing'], files: ci('run: npm ci\n'), name: 'no pnpm step', pkg: { name: 'app' } }],
  valid: [
    { files: pnpmCi, name: 'a pnpm step', pkg: pnpmPkg },
    { files: bunCi, name: 'a bun project', pkg: bunPkg },
  ],
})
testRule(byId('ci-pnpm-version'), {
  invalid: [{ errors: ['missing'], files: ci('      - uses: pnpm/action-setup@v5\n        with:\n          version: 10\n'), name: 'pnpm 10, set to 12', output: '      - uses: pnpm/action-setup@v5\n        with:\n          version: 12\n', pkg: { name: 'app' } }],
  valid: [
    { files: pnpmCi, name: 'pnpm 12', pkg: { name: 'app' } },
    { files: ci('      - uses: pnpm/action-setup@v6.1.0\n        with:\n          run_install: false\n'), name: 'the version comes from packageManager', pkg: pnpmPkg },
  ],
})
testRule(byId('ci-no-frozen-lockfile-flag'), {
  invalid: [{ errors: ['found'], files: ci('      - run: pnpm install --no-frozen-lockfile\n'), name: 'the flag, removed', output: '      - run: pnpm install\n' }],
  valid: [{ files: pnpmCi, name: 'no flag' }],
})
testRule(byId('ci-bun-step'), {
  invalid: [{ errors: ['found'], files: pnpmCi, name: 'a bun project still on pnpm', pkg: bunPkg }],
  valid: [
    { files: bunCi, name: 'a bun workflow', pkg: bunPkg },
    { files: pnpmCi, name: 'a pnpm project that depends on bun', pkg: pnpmPkg },
    { files: bunCi, flags: { isUsingBun: true }, name: 'bun detected without packageManager' },
  ],
})
testRule(byId('ci-bun-version'), {
  invalid: [{ errors: ['missing'], files: ci('      - uses: oven-sh/setup-bun@v1\n'), name: 'setup-bun v1, set to v2', output: '      - uses: oven-sh/setup-bun@v2\n', pkg: bunPkg }],
  valid: [{ files: bunCi, name: 'setup-bun v2', pkg: bunPkg }],
})
