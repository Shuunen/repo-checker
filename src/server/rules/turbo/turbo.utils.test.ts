import { collapseArrays, defaultTask, prefixed, repoBuildTasks, rootPrefix, turboTasks } from './turbo.utils.ts'

describe(repoBuildTasks, () => {
  it('lists the build:* scripts, not build', () => {
    expect.hasAssertions()
    expect(repoBuildTasks({ scripts: { build: 'turbo run build:vite', 'build:tsc': 'tsc -b', 'build:vite': 'vite build', dev: 'vite' } })).toStrictEqual(['build:tsc', 'build:vite'])
  })

  it('lists nothing without scripts', () => {
    expect.hasAssertions()
    expect(repoBuildTasks({ name: 'foo' })).toStrictEqual([])
  })

  it('lists nothing without package.json', () => {
    expect.hasAssertions()
    expect(repoBuildTasks(undefined)).toStrictEqual([])
  })
})

describe(collapseArrays, () => {
  it('puts the arrays of strings on one line', () => {
    expect.hasAssertions()
    expect(collapseArrays('{\n  "a": [\n    "b",\n    "c,d"\n  ],\n  "e": []\n}')).toBe('{\n  "a": ["b", "c,d"],\n  "e": []\n}')
  })
})

describe(rootPrefix, () => {
  it('is the root prefix for root tasks', () => {
    expect.hasAssertions()
    expect(rootPrefix({ '//#lint:types': {} })).toBe('//#')
  })

  it('is empty for package tasks and without tasks', () => {
    expect.hasAssertions()
    expect([rootPrefix({ 'lint:types': {} }), rootPrefix(undefined)]).toStrictEqual(['', ''])
  })
})

describe(prefixed, () => {
  it('prefixes what the task depends on', () => {
    expect.hasAssertions()
    expect(prefixed({ dependsOn: ['lint:install'], inputs: ['src/**'] }, '//#')).toStrictEqual({ dependsOn: ['//#lint:install'], inputs: ['src/**'] })
  })

  it('leaves a task without dependencies as is', () => {
    expect.hasAssertions()
    expect(prefixed({ inputs: ['src/**'] }, '//#')).toStrictEqual({ inputs: ['src/**'] })
  })
})

describe(turboTasks, () => {
  it('lists the tasks run by turbo and the ones they depend on', () => {
    expect.hasAssertions()
    expect(turboTasks({ scripts: { 'build:vite': 'vite build', lint: 'turbo run lint:repo', 'lint:install': 'pnpm install' } })).toStrictEqual(['build:vite', 'lint:install', 'lint:repo'])
  })
})

describe(defaultTask, () => {
  const pkg = { scripts: { 'build:vite': 'vite build', 'lint:cli': 'bun dist/cli.js --help', 'lint:install': 'pnpm install', 'lint:other': 'bun other.ts' } }

  it('waits for the builds when the script reads dist', () => {
    expect.hasAssertions()
    expect(defaultTask('lint:cli', pkg)).toStrictEqual({ dependsOn: ['lint:install', 'build:vite'] })
  })

  it('does not wait for the builds otherwise', () => {
    expect.hasAssertions()
    expect(defaultTask('lint:other', pkg)).toStrictEqual({ dependsOn: ['lint:install'] })
  })

  it('does not make a build wait for itself', () => {
    expect.hasAssertions()
    expect(defaultTask('build:dist', { scripts: { 'build:dist': 'cp -r dist/ out/' } })).toStrictEqual({})
  })
})
