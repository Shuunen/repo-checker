import { testRule } from '../../test/rule-tester.ts'
import { scriptsEslintCache, scriptsFinalEcho, scriptsTsNodeTranspileOnly } from './scripts-commands.rule.ts'

const eslint = { devDependencies: { eslint: '^9.0.0' } }
const tsNode = { devDependencies: { 'ts-node': '^10.0.0' } }

testRule(scriptsFinalEcho, {
  invalid: [
    {
      errors: ['missing', 'missing', 'missing'],
      name: 'build, check and test with the old or no echo, fixed',
      output: { scripts: { build: 'tsc && echo build completed successfully', check: 'pnpm build && echo check completed successfully', test: 'vitest run && echo test completed successfully' } },
      pkg: { scripts: { build: 'tsc', check: 'pnpm build && echo check success', test: 'vitest run' } },
    },
    {
      errors: ['missing'],
      name: 'a task with a fix task gets the hint',
      output: { scripts: { 'lint:format': 'oxfmt --check && echo lint:format completed successfully || (echo Please run pnpm run lint:format:fix to format the code && exit 1)' } },
      pkg: { scripts: { 'lint:format': 'oxfmt --check && echo lint:format completed successfully' } },
    },
    {
      errors: ['missing'],
      name: 'a hint that does not point to the fix task is replaced',
      output: { scripts: { 'lint:issues': 'oxlint && echo lint:issues completed successfully || (echo Please run pnpm run lint:issues:fix to fix the lint issues && exit 1)' } },
      pkg: { scripts: { 'lint:issues': 'oxlint && echo lint:issues completed successfully || (echo Please fix && exit 1)' } },
    },
  ],
  valid: [
    { name: 'every task echoes', pkg: { scripts: { build: 'tsc && echo build completed successfully', lint: 'turbo run lint:types && echo lint completed successfully' } } },
    { name: 'a hint with the fix task', pkg: { scripts: { 'lint:format': 'oxfmt --check && echo lint:format completed successfully || (echo Please run pnpm run lint:format:fix to fix it && exit 1)' } } },
    { name: 'a hint on a task without fix task', pkg: { scripts: { 'lint:types': 'tsc && echo lint:types completed successfully || (echo Please fix the types && exit 1)' } } },
    { name: 'vitest in watch mode', pkg: { scripts: { test: 'vitest' } } },
    { name: 'a --watch flag', pkg: { scripts: { build: 'tsc --watch' } } },
    { name: 'a -w flag', pkg: { scripts: { build: 'tsc -w' } } },
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
