import { testRule } from '../../test/rule-tester.ts'
import { gitignoreTurbo, turboConfig, turboInstalled, turboTasksDeclared } from './turbo.rule.ts'
import { collapseArrays } from './turbo.utils.ts'

const schema = 'https://turborepo.dev/schema.json'
const turbo = { devDependencies: { turbo: '^2.5.0' } }
const check = { check: 'turbo run lint:types test:unit' }
const compact = (value: unknown) => collapseArrays(`${JSON.stringify(value, undefined, 2)}\n`)
const json = (value: unknown) => `${JSON.stringify(value, undefined, 2)}\n`
const all = ['$TURBO_DEFAULT$']
const installFiles = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']
const complete = { $schema: schema, tasks: { 'lint:types': { inputs: all }, 'test:unit': { inputs: all, outputs: ['coverage/**'] } } }

testRule(turboInstalled, {
  invalid: [
    {
      errors: ['dependency', 'file'],
      installs: ['turbo'],
      name: 'nothing',
      output: [compact({ $schema: schema, tasks: { 'lint:types': {}, 'test:unit': { outputs: ['coverage/**'] } } })],
      pkg: { scripts: check },
      remaining: 1,
    },
    {
      errors: ['file'],
      name: 'no turbo.json, lint:repo waits for the builds',
      output: compact({ $schema: schema, tasks: { 'build:tsdown': { outputs: ['dist/**'] }, 'lint:repo': { dependsOn: ['build:tsdown'], inputs: ['$TURBO_DEFAULT$', 'dist/**'] } } }),
      pkg: { ...turbo, scripts: { 'build:tsdown': 'tsdown', lint: 'turbo run lint:repo' } },
    },
    {
      errors: ['file'],
      name: 'no turbo.json, lint:types waits for the install',
      output: compact({ $schema: schema, tasks: { 'lint:install': { inputs: installFiles }, 'lint:types': { dependsOn: ['lint:install'] } } }),
      pkg: { ...turbo, scripts: { lint: 'turbo run lint:types', 'lint:install': 'pnpm install' } },
    },
    { errors: ['file'], name: 'no turbo.json, no task to run', output: compact({ $schema: schema, tasks: {} }), pkg: turbo },
    { errors: ['dependency'], files: { 'turbo.json': '{}' }, installs: ['turbo'], name: 'no dependency', output: [], pkg: { name: 'foo' }, remaining: 1 },
  ],
  valid: [{ files: { 'turbo.json': '{}' }, name: 'both', pkg: turbo }, { files: { 'turbo.json': '' }, name: 'an empty turbo.json', pkg: turbo }, { name: 'no package.json' }],
})

testRule(turboConfig, {
  invalid: [
    {
      errors: ['dependsOn'],
      files: { 'turbo.json': json({ ...complete, tasks: { '//#lint:types': { inputs: all } } }) },
      name: 'a root task waits for the root install',
      output: compact({ ...complete, tasks: { '//#lint:types': { dependsOn: ['//#lint:install'], inputs: all } } }),
      pkg: { scripts: { lint: 'turbo run lint:types', 'lint:install': 'pnpm install' } },
    },
    {
      errors: ['dependsOn', 'dependsOn'],
      files: { 'turbo.json': json({ ...complete, tasks: { 'lint:repo': { dependsOn: ['build:vite'], inputs: all }, 'lint:types': { inputs: all } } }) },
      name: 'the tasks do not wait for the install',
      output: compact({ ...complete, tasks: { 'lint:repo': { dependsOn: ['build:vite', 'lint:install'], inputs: all }, 'lint:types': { dependsOn: ['lint:install'], inputs: all } } }),
      pkg: { scripts: { 'build:vite': 'vite build', lint: 'turbo run lint:repo lint:types', 'lint:install': 'pnpm install' } },
    },
    {
      errors: ['dependsOn'],
      files: { 'turbo.json': json({ ...complete, tasks: { 'lint:repo': { dependsOn: ['build:vite'], inputs: all } } }) },
      name: 'lint:repo does not wait for every build',
      output: compact({ ...complete, tasks: { 'lint:repo': { dependsOn: ['build:vite', 'build:tsdown'], inputs: all } } }),
      pkg: { scripts: { build: 'turbo run build:tsdown build:vite', 'build:tsdown': 'tsdown', 'build:vite': 'vite build', lint: 'turbo run lint:repo' } },
    },
    {
      errors: ['dependsOn'],
      files: { 'turbo.json': json({ ...complete, tasks: { 'lint:repo': { inputs: all } } }) },
      name: 'lint:repo waits for nothing',
      output: compact({ ...complete, tasks: { 'lint:repo': { dependsOn: ['build:vite'], inputs: all } } }),
      pkg: { scripts: { 'build:vite': 'vite build', lint: 'turbo run lint:repo' } },
    },
    {
      errors: ['inputs'],
      files: { 'turbo.json': json({ ...complete, tasks: { 'lint:repo': {} } }) },
      name: 'lint:repo reads the build output git ignores',
      output: compact({ ...complete, tasks: { 'lint:repo': { inputs: ['$TURBO_DEFAULT$', 'dist/**'] } } }),
      pkg: { scripts: { lint: 'turbo run lint:repo' } },
    },
    {
      errors: ['inputs'],
      files: { 'turbo.json': json({ ...complete, tasks: { 'lint:types': { inputs: ['src/**', 'tsconfig*.json'] } } }) },
      name: 'a hand-written list gets the default in front',
      output: compact({ ...complete, tasks: { 'lint:types': { inputs: ['$TURBO_DEFAULT$', 'src/**', 'tsconfig*.json'] } } }),
      pkg: { scripts: { lint: 'turbo run lint:types' } },
    },
    {
      errors: ['schema'],
      files: { 'turbo.json': json({ tasks: {} }) },
      name: 'no schema',
      output: compact({ $schema: schema, tasks: {} }),
      pkg: { name: 'foo' },
    },
    {
      errors: ['schema', 'outputs', 'outputs'],
      files: { 'turbo.json': json({ tasks: { 'build:vite': {}, 'lint:types': {}, 'test:unit': {} } }) },
      name: 'a bare turbo.json',
      output: compact({
        $schema: schema,
        tasks: {
          'build:vite': { outputs: ['dist/**'] },
          'lint:types': {},
          'test:unit': { outputs: ['coverage/**'] },
        },
      }),
      pkg: { scripts: { check: 'turbo run build:vite lint:types test:unit' } },
    },
  ],
  valid: [
    { files: { 'turbo.json': json(complete) }, name: 'a complete turbo.json', pkg: { scripts: check } },
    { files: { 'turbo.json': json({ ...complete, globalDependencies: ['package.json'] }) }, name: 'globalDependencies is not required, nor checked', pkg: { scripts: check } },
    { files: { 'turbo.json': json({ ...complete, tasks: { 'lint:types': { inputs: ['$TURBO_DEFAULT$', '!README.md'] } } }) }, name: 'the default with a negation', pkg: { scripts: { lint: 'turbo run lint:types' } } },
    { files: { 'turbo.json': json({ ...complete, tasks: { '//#lint:types': { inputs: all } } }) }, name: 'a root task', pkg: { scripts: { lint: 'turbo run lint:types' } } },
    { files: { 'turbo.json': json({ ...complete, tasks: { 'lint:repo': { dependsOn: ['build:vite'], inputs: all } } }) }, name: 'lint:repo waits for the build', pkg: { scripts: { 'build:vite': 'vite build', lint: 'turbo run lint:repo' } } },
    { files: { 'turbo.json': json({ ...complete, tasks: { 'test:unit': { dependsOn: ['lint:install'], inputs: all, outputs: ['coverage/**'] } } }) }, name: 'test:unit waits for the install', pkg: { scripts: { 'lint:install': 'pnpm install', test: 'turbo run test:unit' } } },
    { files: { 'turbo.json': json({ ...complete, tasks: { 'lint:install': { inputs: ['package.json'] } } }) }, name: 'lint:install only reads the install files', pkg: { scripts: { lint: 'turbo run lint:install', 'lint:install': 'pnpm install' } } },
    { files: { 'turbo.json': json({ ...complete, tasks: { 'lint:types': { dependsOn: ['lint:install'], inputs: all } } }) }, name: 'lint:types waits for the install', pkg: { scripts: { lint: 'turbo run lint:types', 'lint:install': 'pnpm install' } } },
    { files: { 'turbo.json': json({ ...complete, tasks: { 'lint:repo': { inputs: all } } }) }, name: 'lint:repo without any build', pkg: { scripts: { lint: 'turbo run lint:repo' } } },
    { files: { 'turbo.json': json(complete) }, name: 'a task not declared is for the other check', pkg: { scripts: { lint: 'turbo run lint:custom' } } },
    { name: 'no turbo.json', pkg: { scripts: check } },
  ],
})

testRule(turboTasksDeclared, {
  invalid: [
    {
      errors: ['missing'],
      files: { 'turbo.json': json({ tasks: { '//#lint:types': { inputs: all } } }) },
      name: 'a root install',
      output: compact({ tasks: { '//#lint:install': { inputs: installFiles }, '//#lint:types': { inputs: all } } }),
      pkg: { scripts: { lint: 'turbo run lint:types lint:install', 'lint:install': 'pnpm install' } },
    },
    {
      errors: ['missing', 'missing', 'missing'],
      files: { 'turbo.json': json({ tasks: {} }) },
      name: 'the tasks lint:repo depends on',
      output: compact({
        tasks: {
          'build:vite': { dependsOn: ['lint:install'], outputs: ['dist/**'] },
          'lint:install': { inputs: installFiles },
          'lint:repo': { dependsOn: ['lint:install', 'build:vite'], inputs: ['$TURBO_DEFAULT$', 'dist/**'] },
        },
      }),
      pkg: { scripts: { 'build:vite': 'vite build', lint: 'turbo run lint:repo', 'lint:install': 'pnpm install' } },
    },
    {
      errors: ['missing', 'missing'],
      files: { 'turbo.json': json({ $schema: schema, tasks: { 'lint:types': { inputs: all } } }) },
      name: 'two tasks are not declared',
      output: compact({ $schema: schema, tasks: { 'lint:custom': {}, 'lint:types': { inputs: all }, 'test:unit': { outputs: ['coverage/**'] } } }),
      pkg: { scripts: { check: 'turbo run lint:types lint:custom --concurrency 1', test: 'turbo run test:unit && echo test completed successfully' } },
    },
  ],
  valid: [
    { files: { 'turbo.json': json(complete) }, name: 'every task declared', pkg: { scripts: check } },
    { files: { 'turbo.json': json({ tasks: { '//#lint:types': {} } }) }, name: 'a root task', pkg: { scripts: { lint: 'turbo run lint:types' } } },
    { name: 'no turbo.json', pkg: { scripts: check } },
  ],
})

testRule(gitignoreTurbo, {
  invalid: [{ errors: ['missing'], files: { '.gitignore': 'node_modules\n' }, name: 'turbo cache not ignored', output: '.turbo\nnode_modules\n', pkg: turbo }],
  valid: [
    { files: { '.gitignore': 'node_modules\n.turbo/\n' }, name: '.turbo/ ignored', pkg: turbo },
    { files: { '.gitignore': '.turbo\n' }, name: '.turbo ignored', pkg: turbo },
    { files: { '.gitignore': 'node_modules\n' }, name: 'turbo not used', pkg: { name: 'foo' } },
  ],
})
