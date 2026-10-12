import { forbidCommand, forbidScript, isUsingBun, isUsingEslint } from './scripts.utils.ts'

export const forbiddenScriptRules = [
  forbidScript({ id: 'scripts-no-ci', message: 'a "ci" script, use "check" instead', name: 'ci', severity: 'warning' }),
  forbidScript({ id: 'scripts-no-prepublish', message: 'a "prepublish" script, it is deprecated, use "prepare" instead', name: 'prepublish', severity: 'error' }),
  forbidCommand({ id: 'scripts-bun-install', message: 'script "{{name}}" runs bun i, use bun install', pattern: /\bbun i\b/u, severity: 'error', when: isUsingBun }),
  forbidCommand({ id: 'scripts-bun-no-misleading-build', message: 'script "{{name}}" runs bun build, the bundler, use bun run build to run the build script', names: ['check', 'postversion'], pattern: /\bbun build\b/u, severity: 'error', when: isUsingBun }),
  forbidCommand({ id: 'scripts-bun-no-misleading-test', message: 'script "{{name}}" runs bun test, the bun test runner, use bun run test to run the test script', names: ['check'], pattern: /\bbun test\b/u, severity: 'error', when: isUsingBun }),
  forbidCommand({ id: 'scripts-no-eslint-ignore-path', message: 'script "{{name}}" runs eslint with --ignore-path, use ignores in the eslint config so the CLI and VS Code use the same config', pattern: /\beslint\b.*--ignore-path/u, severity: 'warning', when: isUsingEslint }),
  forbidCommand({ id: 'scripts-no-npm-test', message: 'script "{{name}}" runs npm test, use pnpm test or bun test', pattern: /\bnpm test\b/u, severity: 'warning' }),
  forbidCommand({ id: 'scripts-watchlist-eager', message: 'script "{{name}}" runs watchlist without -eager, like watchlist src tests -eager -- pnpm test', pattern: /\bwatchlist\b(?!.*-eager --)/u, severity: 'warning' }),
]
