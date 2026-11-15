import { testRule } from '../../test/rule-tester.ts'
import { scriptsCheckTurbo } from './scripts-tasks.rule.ts'

testRule(scriptsCheckTurbo, {
  invalid: [
    {
      errors: ['missing'],
      name: 'check without turbo',
      output: { scripts: { check: 'turbo run --output-logs=errors-only lint:types test:unit && echo check completed successfully', 'lint:types': 'tsc', 'test:unit': 'vitest' } },
      pkg: { scripts: { check: 'pnpm lint && pnpm test', 'lint:types': 'tsc', 'test:unit': 'vitest' } },
    },
    {
      errors: ['missing'],
      name: 'check with the old repo-check call and no turbo',
      output: { scripts: { check: 'turbo run --output-logs=errors-only lint:types && echo check completed successfully', 'lint:types': 'tsc' } },
      pkg: { scripts: { check: 'repo-check && pnpm lint', 'lint:types': 'tsc' } },
    },
    {
      errors: ['missing'],
      name: 'a pnpm chain keeps its own steps',
      output: { scripts: { check: 'turbo run --output-logs=errors-only test:unit lint:cli && echo check completed successfully', 'lint:cli': 'bun cli.ts', test: 'turbo run test:unit', 'test:unit': 'vitest' } },
      pkg: { scripts: { check: 'pnpm lint:cli && pnpm test', 'lint:cli': 'bun cli.ts', test: 'turbo run test:unit', 'test:unit': 'vitest' } },
    },
    {
      errors: ['missing'],
      name: 'only the steps worth keeping are carried',
      output: {
        scripts: {
          build: 'turbo run build:vite',
          'build:vite': 'vite build',
          check: 'turbo run --output-logs=errors-only build:vite check:once && echo check completed successfully',
          'check:once': 'bun once.ts',
          lint: 'turbo run lint:types',
          'lint:tsc': 'tsc --noEmit',
          'test:wrap': 'turbo run test:unit',
        },
      },
      pkg: {
        scripts: {
          build: 'turbo run build:vite',
          'build:vite': 'vite build',
          check: 'pnpm install && pnpm lint && pnpm build && pnpm ghost && pnpm lint:tsc && pnpm run check:once && pnpm test:wrap',
          'check:once': 'bun once.ts',
          lint: 'turbo run lint:types',
          'lint:tsc': 'tsc --noEmit',
          'test:wrap': 'turbo run test:unit',
        },
      },
    },
    {
      errors: ['missing'],
      name: 'a plain build is carried',
      output: { scripts: { build: 'bun scripts/build.ts', check: 'turbo run --output-logs=errors-only build && echo check completed successfully' } },
      pkg: { scripts: { build: 'bun scripts/build.ts', check: 'pnpm build' } },
    },
    {
      errors: ['missing'],
      name: 'check runs the build tasks',
      output: { scripts: { 'build:vite': 'vite build', check: 'turbo run --output-logs=errors-only lint:types build:vite && echo check completed successfully', 'lint:types': 'tsc' } },
      pkg: { scripts: { 'build:vite': 'vite build', check: 'turbo run --output-logs=errors-only lint:types', 'lint:types': 'tsc' } },
    },
    {
      errors: ['missing', 'logs'],
      name: 'lint:install goes first, after the flag',
      output: { scripts: { check: 'turbo run --output-logs=errors-only lint:install lint:types && echo check completed successfully', 'lint:install': 'pnpm install', 'lint:types': 'tsc' } },
      pkg: { scripts: { check: 'turbo run --output-logs=full lint:types', 'lint:install': 'pnpm install', 'lint:types': 'tsc' } },
    },
    {
      errors: ['repoCheck'],
      name: 'check runs repo-check itself',
      output: { scripts: { check: 'turbo run --output-logs=errors-only lint:repo && echo check completed successfully', 'lint:repo': 'repo-check' } },
      pkg: { scripts: { check: 'repo-check && turbo run --output-logs=errors-only lint:repo && echo check completed successfully', 'lint:repo': 'repo-check' } },
    },
    {
      errors: ['missing', 'missing'],
      name: 'check runs the steps of lint',
      output: { scripts: { check: 'turbo run --output-logs=errors-only lint:cli && echo check completed successfully', lint: 'turbo run lint:cli && echo lint completed successfully', 'lint:cli': 'bun cli.ts' } },
      pkg: { scripts: { check: 'pnpm lint', lint: 'pnpm lint:cli', 'lint:cli': 'bun cli.ts' } },
    },
    {
      errors: ['logs'],
      name: 'check shows more than the errors',
      output: { scripts: { check: 'turbo run --output-logs=errors-only lint:types && echo check completed successfully', 'lint:types': 'tsc' } },
      pkg: { scripts: { check: 'turbo run lint:types', 'lint:types': 'tsc' } },
    },
    {
      errors: ['missing'],
      name: 'turbo without a task',
      output: { scripts: { check: 'turbo run --output-logs=errors-only lint:types test:unit && echo check completed successfully', 'lint:types': 'tsc', 'test:unit': 'vitest' } },
      pkg: { scripts: { check: 'turbo run --output-logs=errors-only lint:types --output-logs=errors-only', 'lint:types': 'tsc', 'test:unit': 'vitest' } },
    },
    {
      errors: ['missing'],
      name: 'lint without a task',
      output: { scripts: { lint: 'turbo run lint:types lint:format && echo lint completed successfully', 'lint:format': 'oxfmt', 'lint:types': 'tsc' } },
      pkg: { scripts: { lint: 'turbo run lint:types', 'lint:format': 'oxfmt', 'lint:types': 'tsc' } },
    },
  ],
  valid: [
    { name: 'every task through turbo', pkg: { scripts: { check: 'repo-check && turbo run --output-logs=errors-only lint:types test:unit', 'lint:types': 'tsc', 'test:unit': 'vitest' } } },
    { name: 'lint does not need the flag', pkg: { scripts: { lint: 'turbo run lint:types', 'lint:types': 'tsc' } } },
    { name: 'no task to run', pkg: { scripts: { check: 'pnpm test' } } },
    { name: 'a lint:repo that is not repo-check keeps the repo-check step', pkg: { scripts: { check: 'turbo run --output-logs=errors-only lint:repo && repo-check', 'lint:repo': 'bun x.ts' } } },
    { name: 'no check nor lint', pkg: { scripts: { dev: 'vite' } } },
    { name: 'no scripts', pkg: { name: 'foo' } },
  ],
})
