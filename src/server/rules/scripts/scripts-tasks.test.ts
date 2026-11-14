import { testRule } from '../../test/rule-tester.ts'
import { scriptsBuildTasks, scriptsBun, scriptsCommands, scriptsNoDuplicateLint, scriptsRequiredTasks } from './scripts-tasks.rule.ts'
import { taskScript } from './tasks.utils.ts'

/**
 * Build a scripts section, keys sorted like the fixer keeps them
 * @param entries the task names and their script
 * @returns the scripts
 */
function sorted(entries: Record<string, string>) {
  return Object.fromEntries(Object.entries(entries).toSorted(([first], [second]) => (first < second ? -1 : 1)))
}

const core = ['lint', 'lint:format', 'lint:format:fix', 'lint:install', 'lint:issues', 'lint:issues:fix', 'lint:knip', 'lint:repo', 'lint:types', 'test', 'test:unit', 'test:update', 'test:watch', 'up:deps']
const coreScripts = Object.fromEntries(core.map(name => [name, 'x']))
const withoutLint = Object.fromEntries(Object.entries(coreScripts).filter(([name]) => name !== 'lint'))
const tsconfigs = { 'tsconfig.app.json': '{}', 'tsconfig.node.json': '{}' }
const tools = { devDependencies: { '@playwright/test': '^1.0.0', vite: '^8.0.0', vitest: '^4.0.0' } }
const typesCommand = 'tsc -p tsconfig.app.json && tsc -p tsconfig.node.json'

testRule(scriptsRequiredTasks, {
  invalid: [
    {
      errors: Array.from({ length: 14 }, () => 'missing'),
      name: 'nothing, only the tasks without a tool are fixed',
      output: {
        scripts: sorted({
          lint: taskScript('lint', 'turbo run lint:install lint:types lint:knip lint:format lint:issues lint:repo'),
          'lint:format': taskScript('lint:format', 'oxfmt --check'),
          'lint:format:fix': taskScript('lint:format:fix', 'oxfmt --write'),
          'lint:install': taskScript('lint:install', 'pnpm install'),
          'lint:issues': taskScript('lint:issues', 'oxlint --type-aware --deny-warnings --report-unused-disable-directives'),
          'lint:issues:fix': taskScript('lint:issues:fix', 'oxlint --fix --fix-suggestions --fix-dangerously --type-aware --deny-warnings --report-unused-disable-directives'),
          'lint:knip': taskScript('lint:knip', 'knip'),
          'lint:repo': taskScript('lint:repo', 'repo-check'),
          'up:deps': taskScript('up:deps', 'pnpm update --recursive --latest'),
        }),
      },
      pkg: { scripts: {} },
      remaining: 5,
    },
    {
      errors: Array.from({ length: 19 }, () => 'missing'),
      files: { ...tsconfigs, 'index.html': '<html></html>' },
      name: 'nothing, with Vitest, Playwright and a Vite app',
      output: {
        ...tools,
        scripts: sorted({
          lint: taskScript('lint', 'turbo run lint:install lint:types lint:knip lint:format lint:issues lint:repo'),
          'lint:format': taskScript('lint:format', 'oxfmt --check'),
          'lint:format:fix': taskScript('lint:format:fix', 'oxfmt --write'),
          'lint:install': taskScript('lint:install', 'pnpm install'),
          'lint:issues': taskScript('lint:issues', 'oxlint --type-aware --deny-warnings --report-unused-disable-directives'),
          'lint:issues:fix': taskScript('lint:issues:fix', 'oxlint --fix --fix-suggestions --fix-dangerously --type-aware --deny-warnings --report-unused-disable-directives'),
          'lint:knip': taskScript('lint:knip', 'knip'),
          'lint:repo': taskScript('lint:repo', 'repo-check'),
          'lint:types': taskScript('lint:types', typesCommand),
          test: taskScript('test', 'turbo run test:unit test:e2e'),
          'test:e2e': taskScript('test:e2e', 'playwright test'),
          'test:ui': 'vitest --ui',
          'test:unit': taskScript('test:unit', 'vitest run --coverage'),
          'test:update': taskScript('test:update', 'vitest run --update'),
          'test:watch': 'vitest',
          'up:deps': taskScript('up:deps', 'pnpm update --recursive --latest'),
        }),
      },
      pkg: { ...tools, scripts: {} },
      remaining: 3,
    },
    {
      errors: ['missing'],
      name: 'lint is created with the own lint tasks of check',
      output: {
        scripts: sorted({
          ...coreScripts,
          check: 'turbo run lint:sources lint:tsc lint:ghost lint:format:fix',
          lint: taskScript('lint', 'turbo run lint:install lint:types lint:knip lint:format lint:issues lint:repo lint:sources'),
          'lint:sources': 'bun lint.ts',
          'lint:tsc': 'tsc --noEmit',
        }),
      },
      pkg: { scripts: sorted({ ...withoutLint, check: 'turbo run lint:sources lint:tsc lint:ghost lint:format:fix', 'lint:sources': 'bun lint.ts', 'lint:tsc': 'tsc --noEmit' }) },
    },
    {
      errors: ['missing'],
      name: 'Playwright without Vitest',
      output: { devDependencies: { '@playwright/test': '^1.0.0' }, scripts: sorted({ ...coreScripts, 'test:e2e': 'playwright test && echo test:e2e completed successfully' }) },
      pkg: { devDependencies: { '@playwright/test': '^1.0.0' }, scripts: coreScripts },
    },
  ],
  valid: [
    { name: 'every core task', pkg: { scripts: coreScripts } },
    { name: 'Vite without index.html is not a web app', pkg: { devDependencies: { vite: '^8.0.0' }, scripts: coreScripts } },
    { flags: { repoId: 'repo-checker' }, name: 'repo-checker runs its own sources, no lint:repo', pkg: { scripts: Object.fromEntries(core.filter(name => name !== 'lint:repo').map(name => [name, 'x'])) } },
    { name: 'no scripts', pkg: { name: 'foo' } },
  ],
})

testRule(scriptsCommands, {
  invalid: [
    {
      errors: ['wrong'],
      name: 'a formatter that does not check, the hint is kept',
      output: { scripts: { 'lint:format': 'oxfmt --check && echo lint:format completed successfully || (echo Please run pnpm run lint:format:fix to fix it && exit 1)' } },
      pkg: { scripts: { 'lint:format': 'oxfmt src && echo lint:format completed successfully || (echo Please run pnpm run lint:format:fix to fix it && exit 1)' } },
    },
    { errors: ['wrong'], name: 'lint:repo with flags', output: { scripts: { 'lint:repo': 'repo-check && echo lint:repo completed successfully' } }, pkg: { scripts: { 'lint:repo': 'repo-check --verbose' } } },
    { errors: ['custom'], name: 'a lint:repo that is not repo-check is only reported', pkg: { scripts: { 'lint:repo': 'bun src/bin/repo-lint.cli.ts' } } },
    { errors: ['wrong'], name: 'a watch task', output: { scripts: { 'test:watch': 'vitest' } }, pkg: { scripts: { 'test:watch': 'vitest run' } } },
    { errors: ['wrong'], name: 'up:deps without recursive', output: { scripts: { 'up:deps': 'pnpm update --recursive --latest && echo up:deps completed successfully' } }, pkg: { scripts: { 'up:deps': 'pnpm update --latest' } } },
    {
      errors: ['wrong'],
      files: tsconfigs,
      name: 'tsgo for lint:types',
      output: { scripts: { 'lint:types': `${typesCommand} && echo lint:types completed successfully` } },
      pkg: { scripts: { 'lint:types': 'tsgo -p tsconfig.app.json && tsgo -p tsconfig.node.json' } },
    },
    {
      errors: ['wrong'],
      files: tsconfigs,
      name: 'a tsconfig is not checked, the convex one is kept',
      output: { scripts: { 'lint:types': `${typesCommand} && tsc -p convex/tsconfig.json && echo lint:types completed successfully` } },
      pkg: { scripts: { 'lint:types': 'tsc -p tsconfig.app.json && tsc -p convex/tsconfig.json' } },
    },
    { errors: ['wrong'], name: 'test without turbo', output: { scripts: { test: 'turbo run test:unit && echo test completed successfully' } }, pkg: { scripts: { test: 'vitest --run --coverage' } } },
    {
      errors: ['wrong'],
      name: 'test without the e2e task',
      output: { devDependencies: { '@playwright/test': '^1.0.0' }, scripts: { test: 'turbo run test:unit test:e2e && echo test completed successfully' } },
      pkg: { devDependencies: { '@playwright/test': '^1.0.0' }, scripts: { test: 'turbo run test:unit' } },
    },
  ],
  valid: [
    { files: tsconfigs, name: 'every tsconfig and the convex one', pkg: { scripts: { 'lint:types': `${typesCommand} && tsc -p convex/tsconfig.json && echo lint:types completed successfully` } } },
    { files: { 'tsconfig.json': '{}' }, name: 'a single tsconfig', pkg: { scripts: { 'lint:types': 'tsc -p tsconfig.json' } } },
    { name: 'no tsconfig, no opinion', pkg: { scripts: { 'lint:types': 'whatever' } } },
    { name: 'watch with coverage', pkg: { scripts: { 'test:watch': 'vitest --coverage' } } },
    { flags: { repoId: 'repo-checker' }, name: 'repo-checker lint:repo runs the sources', pkg: { scripts: { 'lint:repo': 'bun dist/cli.js' } } },
    { name: 'a task without opinion', pkg: { scripts: { dev: 'vite' } } },
    { name: 'no scripts', pkg: { name: 'foo' } },
  ],
})

const bun = { scripts: { start: 'bun src/index.ts' } }
const bunPkg = { devDependencies: { bun: '^1.3.0' }, ...bun }

testRule(scriptsBun, {
  invalid: [
    { errors: ['dependency', 'allowBuilds'], installs: ['bun'], name: 'no dependency, no workspace file', output: [{ devDependencies: { bun: '^1.3.0' }, ...bun }, 'allowBuilds:\n  bun: true\n'], pkg: bun, remaining: 0 },
    { errors: ['allowBuilds'], files: { 'pnpm-workspace.yaml': 'packages:\n  - .\n' }, name: 'a workspace without allowBuilds', output: 'packages:\n  - .\nallowBuilds:\n  bun: true\n', pkg: bunPkg },
    { errors: ['allowBuilds'], files: { 'pnpm-workspace.yaml': 'allowBuilds:\n  esbuild: true\n' }, name: 'allowBuilds without bun', output: 'allowBuilds:\n  bun: true\n  esbuild: true\n', pkg: bunPkg },
    { errors: ['allowBuilds'], files: { 'pnpm-workspace.yaml': 'allowBuilds:\n  bun: false\n' }, name: 'bun refused', output: 'allowBuilds:\n  bun: true\n', pkg: bunPkg },
    { errors: ['allowBuilds'], files: { 'pnpm-workspace.yaml': '' }, name: 'an empty workspace', output: 'allowBuilds:\n  bun: true\n', pkg: bunPkg },
  ],
  valid: [
    { files: { 'pnpm-workspace.yaml': 'allowBuilds:\n  bun: true\n' }, name: 'dependency and allowBuilds', pkg: bunPkg },
    { name: 'no script runs bun', pkg: { scripts: { dev: 'vite' } } },
  ],
})

testRule(scriptsBuildTasks, {
  invalid: [
    {
      errors: ['found'],
      name: 'tsc and vite in one build',
      output: { scripts: { build: 'turbo run build:tsc build:vite && echo build completed successfully', 'build:tsc': 'tsc -b && echo build:tsc completed successfully', 'build:vite': 'vite build && echo build:vite completed successfully' } },
      pkg: { scripts: { build: 'tsc -b && vite build && echo build success' } },
    },
    {
      errors: ['found'],
      name: 'tsdown alone, the hint is kept',
      output: { scripts: { build: 'turbo run build:tsdown && echo build completed successfully || (echo Please fix && exit 1)', 'build:tsdown': 'tsdown && echo build:tsdown completed successfully' } },
      pkg: { scripts: { build: 'tsdown && echo build completed successfully || (echo Please fix && exit 1)' } },
    },
    { errors: ['found'], name: 'a build tool we do not know, not fixed', pkg: { scripts: { build: 'bun scripts/build.ts' } } },
  ],
  valid: [
    { name: 'build runs the build tasks', pkg: { scripts: { build: 'turbo run build:tsc build:vite', 'build:tsc': 'tsc -b', 'build:vite': 'vite build' } } },
    { name: 'no build script', pkg: { scripts: { dev: 'vite' } } },
    { name: 'no scripts', pkg: { name: 'foo' } },
  ],
})

testRule(scriptsNoDuplicateLint, {
  invalid: [
    {
      errors: ['found', 'found'],
      name: 'old tsc and oxlint tasks, and the calls to them',
      output: { scripts: { check: 'pnpm lint && echo check success', lint: 'pnpm lint:format && echo lint success' } },
      pkg: { scripts: { check: 'pnpm lint && echo check success', lint: 'pnpm lint:tsc && pnpm lint:format && pnpm run lint:oxlint && echo lint success', 'lint:oxlint': 'oxlint src --fix', 'lint:tsc': 'tsc --noEmit && echo lint:tsc success' } },
    },
    {
      errors: ['found'],
      name: 'the name in a turbo run',
      output: { scripts: { lint: 'turbo run lint:types lint:format && echo lint success' } },
      pkg: { scripts: { format: 'oxfmt --write', lint: 'turbo run lint:types format lint:format && echo lint success' } },
    },
  ],
  valid: [
    { name: 'the agreed tasks', pkg: { scripts: { 'lint:format': 'oxfmt --check', 'lint:issues': 'oxlint --type-aware', 'lint:types': 'tsc --noEmit' } } },
    { name: 'a build, a test or a hook', pkg: { scripts: { build: 'tsc --noEmit && vite build', check: 'oxlint', preversion: 'oxlint', test: 'oxlint', 'test:unit': 'oxlint' } } },
    { name: 'another tool', pkg: { scripts: { 'lint:md': 'markdownlint .' } } },
    { name: 'no scripts', pkg: { name: 'foo' } },
  ],
})
