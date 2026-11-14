import { testRule } from '../../test/rule-tester.ts'
import { scriptsLintTasksListed } from './scripts-tasks.rule.ts'

const scripts = { 'lint:cli': 'bun cli.ts', 'lint:format': 'oxfmt --check', 'lint:format:fix': 'oxfmt --write', 'lint:types': 'tsc' }

testRule(scriptsLintTasksListed, {
  invalid: [
    {
      errors: ['missing', 'missing'],
      name: 'a lint task in neither lint nor check',
      output: { scripts: { check: 'turbo run --output-logs=errors-only lint:types lint:cli lint:format && echo check completed successfully', lint: 'turbo run lint:format lint:types lint:cli && echo lint completed successfully', ...scripts } },
      pkg: { scripts: { ...scripts, check: 'turbo run lint:types', lint: 'turbo run lint:format lint:types' } },
    },
    {
      errors: ['missing'],
      name: 'a lint task missing from check only, the echo is kept',
      output: { scripts: { check: 'turbo run --output-logs=errors-only lint:types lint:format lint:cli && echo check completed successfully', lint: 'turbo run lint:cli lint:format lint:types', ...scripts } },
      pkg: { scripts: { ...scripts, check: 'turbo run lint:types lint:format && echo check completed successfully', lint: 'turbo run lint:cli lint:format lint:types' } },
    },
  ],
  valid: [
    { name: 'every lint task is run, the fix tasks are not', pkg: { scripts: { ...scripts, check: 'turbo run lint:cli lint:format lint:types', lint: 'turbo run lint:cli lint:format lint:types' } } },
    { name: 'no turbo run yet, scripts-check-turbo handles it', pkg: { scripts: { ...scripts, check: 'pnpm lint', lint: 'pnpm lint:types' } } },
    { name: 'no check nor lint', pkg: { scripts } },
    { name: 'no scripts', pkg: { name: 'foo' } },
  ],
})
