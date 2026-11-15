import { invariant } from 'es-toolkit'
import { testRule } from '../../test/rule-tester.ts'
import { workflowQualityRules } from './workflow-quality.rule.ts'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = workflowQualityRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

/**
 * Build the text of a file from its lines
 * @param rows the lines
 * @returns the text, with a final new line
 */
function text(...rows: string[]) {
  return `${rows.join('\n')}\n`
}

/**
 * Build the files of a project with a workflow
 * @param rows the lines of the workflow
 * @returns the files
 */
function workflow(...rows: string[]) {
  return { '.github/workflows/ci.yml': text(...rows) }
}

const head = ['name: ci', '', 'on: push', '', 'jobs:', '  ci:', '    runs-on: ubuntu-latest', '', '    steps:']
const checkout = ['      - name: Checkout', '        uses: actions/checkout@v7', '']
const nodeStep = ['      - name: Setup node', '        uses: actions/setup-node@v7', '        with:', '          node-version: 26', '']
const pnpmStep = ['      - name: Setup pnpm', '        uses: pnpm/action-setup@v6', '']
const check = ['      - name: Run check 👀', '        run: pnpm run check']
const bun = { packageManager: 'bun@1.4.2' }

testRule(byId('ci-runs-check'), {
  invalid: [
    { errors: ['missing'], files: workflow('jobs:', '  ci:', '    steps:', '      - run: pnpm check'), name: 'pnpm check, written pnpm run check', output: text('jobs:', '  ci:', '    steps:', '      - run: pnpm run check') },
    { errors: ['missing'], files: workflow(...head, ...checkout, ...nodeStep.slice(0, -1)), name: 'no check step, one is added', output: text(...head, ...checkout, ...nodeStep, ...check) },
    { errors: ['missing'], files: workflow('jobs:', '  ci:', '    steps:', '      - run: bun check'), name: 'bun check, in a bun project', output: text('jobs:', '  ci:', '    steps:', '      - run: bun run check'), pkg: bun },
    { errors: ['missing'], files: workflow(...head, ...checkout, ...check.map(row => row.replace('run check', 'run test'))), name: 'runs another script than check, one is added', output: text(...head, ...checkout, ...check.map(row => row.replace('run check', 'run test')), '', ...check) },
    { errors: ['missing'], files: workflow('jobs: {}'), name: 'no steps to add to, not fixed' },
  ],
  valid: [{ files: workflow(...head, ...checkout, ...check), name: 'pnpm run check' }, { files: workflow('      - run: bun run check'), name: 'bun run check', pkg: bun }, { name: 'no workflow, skipped' }],
})

testRule(byId('ci-on-push'), {
  invalid: [
    { errors: ['missing'], files: workflow('on: pull_request', 'jobs: {}'), name: 'pull requests only', output: text('on: push', 'jobs: {}') },
    { errors: ['missing'], files: workflow('on: [pull_request, workflow_dispatch]', 'jobs: {}'), name: 'a list without push', output: text('on: [push, pull_request, workflow_dispatch]', 'jobs: {}') },
    { errors: ['missing'], files: workflow('on:', '  pull_request:', 'jobs: {}'), name: 'a block without push', output: text('on:', '  push:', '  pull_request:', 'jobs: {}') },
  ],
  valid: [
    { files: workflow('on: push', 'jobs: {}'), name: 'on: push' },
    { files: workflow('on: [pull_request, push]', 'jobs: {}'), name: 'push in a list' },
    { files: workflow('on:', '  pull_request:', '', '  push:', '    branches:', '      - master', 'jobs: {}'), name: 'push in a block, after a blank line' },
  ],
})

testRule(byId('ci-frozen-lockfile'), {
  invalid: [
    { errors: ['found'], files: workflow('      - run: pnpm install'), name: 'pnpm install', output: text('      - run: pnpm install --frozen-lockfile') },
    { errors: ['found'], files: workflow('      - run: bun install && bun run check'), name: 'bun install in a chain', output: text('      - run: bun install --frozen-lockfile && bun run check') },
  ],
  valid: [
    { files: workflow('      - run: pnpm install --frozen-lockfile && echo install dependencies ok ✅'), name: 'frozen' },
    { files: workflow('      - run: pnpm run check'), name: 'no install step' },
  ],
})

const cachedNode = [...nodeStep.slice(0, -1), '          cache: pnpm', '']
const ordered = [...head, ...checkout, ...pnpmStep, ...cachedNode, ...check]

testRule(byId('ci-node-pnpm-cache'), {
  invalid: [
    { errors: ['missing'], files: workflow(...head, ...checkout, ...nodeStep, ...pnpmStep, ...check), name: 'node before pnpm and no cache, reordered', output: text(...ordered) },
    { errors: ['missing'], files: workflow(...head, ...checkout, ...pnpmStep, ...nodeStep, ...check), name: 'pnpm first but no cache', output: text(...ordered) },
    { errors: ['missing'], files: workflow(...head, ...checkout, ...pnpmStep, ...cachedNode.map(row => row.replace('pnpm', 'npm')), ...check), name: 'the cache is npm', output: text(...ordered) },
  ],
  valid: [
    { files: workflow(...ordered), name: 'cached, pnpm first' },
    { files: workflow(...head, ...pnpmStep, ...cachedNode.map(row => row.replace('pnpm', "'pnpm'")), ...check), name: 'quoted' },
    { files: workflow(...head, ...checkout, ...nodeStep, ...check), name: 'no pnpm step, ci-pnpm-step reports it' },
    { files: workflow(...head, ...checkout, ...pnpmStep, ...check), name: 'no node step' },
    { files: workflow(...head, ...nodeStep, ...pnpmStep, ...check), name: 'a bun project', pkg: bun },
  ],
})

const playwright = { devDependencies: { '@playwright/test': '1.0.0' } }
const bunPlaywright = { ...playwright, packageManager: 'bun@1.4.2' }
const installStep = ['      - name: Install Playwright', '        run: pnpm exec playwright install --with-deps chromium-headless-shell', '']
const dollar = '$'
const cacheStep = ['      - name: Cache Playwright browsers', '        uses: actions/cache@v6', '        id: playwright-cache', '        with:', '          path: ~/.cache/ms-playwright', `          key: playwright-${dollar}{{ hashFiles('pnpm-lock.yaml') }}`, '']

testRule(byId('ci-playwright-install'), {
  invalid: [
    { errors: ['missing'], files: workflow(...head, ...checkout, ...check), name: 'installed before the check step', output: text(...head, ...checkout, ...installStep, ...check), pkg: playwright },
    { errors: ['missing'], files: workflow(...head, ...checkout.slice(0, -1)), name: 'no check step, added at the end', output: text(...head, ...checkout, ...installStep.slice(0, -1)), pkg: playwright },
    {
      errors: ['missing'],
      files: workflow(...head, ...checkout, '      - run: bun run check'),
      name: 'a bun project',
      output: text(...head, ...checkout, '      - name: Install Playwright', '        run: bunx playwright install --with-deps chromium-headless-shell', '', '      - run: bun run check'),
      pkg: bunPlaywright,
    },
    { errors: ['missing'], files: workflow('jobs: {}'), name: 'no steps, indent fallback', output: text('jobs: {}', '', ...installStep.slice(0, -1)), pkg: playwright },
  ],
  valid: [
    { files: workflow(...head, ...checkout, ...installStep, ...check), name: 'installed', pkg: playwright },
    { files: workflow(...head, ...checkout, ...check), name: 'no playwright' },
    { name: 'no workflow', pkg: playwright },
  ],
})

testRule(byId('ci-playwright-cache'), {
  invalid: [
    { errors: ['missing'], files: workflow(...head, ...checkout, ...installStep, ...check), name: 'cached before the install step', output: text(...head, ...checkout, ...cacheStep, ...installStep, ...check), pkg: playwright },
    { errors: ['missing'], files: workflow(...head, ...checkout, ...check), name: 'cached before the check step', output: text(...head, ...checkout, ...cacheStep, ...check), pkg: playwright },
    {
      errors: ['missing'],
      files: workflow(...head, ...checkout, '      - run: bun run check'),
      name: 'a bun project keys on bun.lock',
      output: text(...head, ...checkout, ...cacheStep.map(row => row.replace('pnpm-lock.yaml', 'bun.lock')), '      - run: bun run check'),
      pkg: bunPlaywright,
    },
  ],
  valid: [
    { files: workflow(...head, ...checkout, ...cacheStep, ...installStep, ...check), name: 'cached', pkg: playwright },
    { files: workflow(...head, ...checkout, ...check), name: 'no playwright' },
  ],
})
