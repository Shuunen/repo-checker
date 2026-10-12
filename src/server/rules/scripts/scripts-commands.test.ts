import { testRule } from '../../engine/rule-tester.ts'
import { scriptsEslintCache, scriptsFinalEcho, scriptsTsNodeTranspileOnly } from './scripts-commands.rule.ts'

const eslint = { devDependencies: { eslint: '^9.0.0' } }
const tsNode = { devDependencies: { 'ts-node': '^10.0.0' } }

testRule(scriptsFinalEcho, {
  invalid: [{ errors: ['missing', 'missing'], name: 'build and test without echo', pkg: { scripts: { build: 'tsc', check: 'pnpm build && echo check success', test: 'vitest' } } }],
  valid: [
    { name: 'every task echoes', pkg: { scripts: { build: 'tsc && echo build success', lint: 'eslint src && echo lint done' } } },
    { name: 'no such task', pkg: { scripts: { dev: 'vite' } } },
    { name: 'no scripts at all', pkg: { name: 'foo' } },
  ],
})

testRule(scriptsEslintCache, {
  invalid: [{ errors: ['missing'], name: 'eslint without cache', output: { ...eslint, scripts: { lint: 'eslint --cache src' } }, pkg: { ...eslint, scripts: { lint: 'eslint src' } } }],
  valid: [
    { name: 'eslint with cache', pkg: { ...eslint, scripts: { lint: 'eslint src --cache' } } },
    { name: 'eslint not used', pkg: { scripts: { lint: 'oxlint src' } } },
  ],
})

testRule(scriptsTsNodeTranspileOnly, {
  invalid: [{ errors: ['found'], files: { 'scripts/run.sh': 'ts-node src/index.ts\n' }, name: 'ts-node without transpileOnly', pkg: tsNode }],
  valid: [
    { files: { 'scripts/run.sh': 'ts-node --transpileOnly src/index.ts\n' }, name: 'ts-node with transpileOnly', pkg: tsNode },
    { files: { 'node_modules/x/run.sh': 'ts-node src/index.ts\n' }, name: 'only in node_modules', pkg: tsNode },
    { name: 'ts-node not used', pkg: { scripts: { dev: 'tsx src' } } },
  ],
})
