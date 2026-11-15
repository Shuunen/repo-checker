import { fixer, setOption } from './fixer.ts'

describe('fixer json edits', () => {
  it('keeps a 4 spaces indent and the comments', () => {
    expect.hasAssertions()
    const text = '{\n    // the name\n    "name": "foo"\n}\n'
    expect(fixer.json('package.json').set(['version'], '1.0.0').apply(text)).toBe('{\n    // the name\n    "name": "foo",\n    "version": "1.0.0"\n}\n')
  })

  it('keeps a tab indent and crlf line endings', () => {
    expect.hasAssertions()
    const text = '{\r\n\t"name": "foo"\r\n}\r\n'
    expect(fixer.json('package.json').set(['version'], '1.0.0').apply(text)).toBe('{\r\n\t"name": "foo",\r\n\t"version": "1.0.0"\r\n}\r\n')
  })

  it('inserts first when asked', () => {
    expect.hasAssertions()
    expect(fixer.json('package.json').set(['$schema'], 'x', { isFirst: true }).apply('{\n  "name": "foo"\n}')).toBe('{\n  "$schema": "x",\n  "name": "foo"\n}')
  })

  it('inserts at its sorted place when the keys are sorted', () => {
    expect.hasAssertions()
    expect(fixer.json('.oxfmtrc.json').set(['endOfLine'], 'lf').apply('{\n  "arrowParens": "avoid",\n  "semi": false\n}')).toBe('{\n  "arrowParens": "avoid",\n  "endOfLine": "lf",\n  "semi": false\n}')
    expect(fixer.json('.oxfmtrc.json').set(['useTabs'], false).apply('{\n  "semi": false\n}')).toBe('{\n  "semi": false,\n  "useTabs": false\n}')
  })

  it('appends when the keys are not sorted', () => {
    expect.hasAssertions()
    expect(fixer.json('.oxfmtrc.json').set(['endOfLine'], 'lf').apply('{\n  "useTabs": false,\n  "tabWidth": 2\n}')).toBe('{\n  "useTabs": false,\n  "tabWidth": 2,\n  "endOfLine": "lf"\n}')
  })

  it('sorts the root keys when asked', () => {
    expect.hasAssertions()
    expect(fixer.json('.oxfmtrc.json').set(['endOfLine'], 'lf', { isSorted: true }).apply('{\n  "useTabs": false,\n  "ignore": [\n    "a"\n  ],\n  "tabWidth": 2\n}')).toBe('{\n  "endOfLine": "lf",\n  "ignore": [\n    "a"\n  ],\n  "tabWidth": 2,\n  "useTabs": false\n}')
    expect(fixer.json('a.json').set(['x'], 1, { isSorted: true }).apply('')).toBe('{\n  "x": 1\n}')
    expect(fixer.json('a.json').set(['b'], 1, { isSorted: true }).apply('{\r\n  "c": 1,\r\n  "a": 1\r\n}')).toBe('{\r\n  "a": 1,\r\n  "b": 1,\r\n  "c": 1\r\n}')
  })

  it('does not reformat the inline value before a new key', () => {
    expect.hasAssertions()
    expect(fixer.json('settings.json').set(['workbench.colorCustomizations'], { shade: 'b' }).apply('{\n  "cSpell.words": ["resultx"]\n}\n')).toBe('{\n  "cSpell.words": ["resultx"],\n  "workbench.colorCustomizations": {\n    "shade": "b"\n  }\n}\n')
  })

  it('does not reformat the inline values around a key inserted in the middle', () => {
    expect.hasAssertions()
    expect(fixer.json('a.json').set(['b'], 1).apply('{\n  "a": ["x", "y"],\n  "c": { "d": 1 }\n}\n')).toBe('{\n  "a": ["x", "y"],\n  "b": 1,\n  "c": { "d": 1 }\n}\n')
  })

  it('does not reformat the siblings of a nested key', () => {
    expect.hasAssertions()
    expect(fixer.json('a.json').set(['scripts', 'test'], 'vitest').apply('{\n  "files": ["dist"],\n  "scripts": {\n    "build": "tsc",\n    "lint": ["a"]\n  }\n}\n')).toBe('{\n  "files": ["dist"],\n  "scripts": {\n    "build": "tsc",\n    "lint": ["a"],\n    "test": "vitest"\n  }\n}\n')
  })

  it('creates a file content from nothing', () => {
    expect.hasAssertions()
    expect(fixer.json('renovate.json').set(['extends'], ['config:base']).apply('')).toBe('{\n  "extends": [\n    "config:base"\n  ]\n}')
  })

  it('removes a key', () => {
    expect.hasAssertions()
    expect(fixer.json('package.json').remove(['private']).apply('{\n  "name": "foo",\n  "private": true\n}')).toBe('{\n  "name": "foo"\n}')
  })

  it('updates from the current value', () => {
    expect.hasAssertions()
    expect(
      fixer
        .json('package.json')
        .update(['version'], current => `${String(current)}-beta`)
        .apply('{ "version": "1.0.0" }'),
    ).toBe('{ "version": "1.0.0-beta" }')
  })
})

describe('fixer text edits', () => {
  it('replaces text', () => {
    expect.hasAssertions()
    expect(fixer.text('.nvmrc', text => text.replace('22', '24')).apply('22\n')).toBe('24\n')
  })
})

describe('fixer config edits', () => {
  it('changes the options exported by default, keeping the rest of the file', () => {
    expect.hasAssertions()
    const text = "import { defineConfig } from 'vitest/config'\n\nexport default defineConfig({\n  test: { globals: true },\n})\n"
    expect(
      fixer
        .config('vitest.config.ts', options => {
          options.test ??= {}
          options.test.pool = 'threads'
        })
        .apply(text),
    ).toContain("pool: 'threads'")
  })

  it('changes the options of a defineConfig given to mergeConfig', () => {
    expect.hasAssertions()
    const text = "import { defineConfig, mergeConfig } from 'vitest/config'\nimport viteConfig from './vite.config.ts'\n\nexport default mergeConfig(\n  viteConfig,\n  defineConfig({\n    test: { globals: true },\n  }),\n)\n"
    const fixed = fixer
      .config('vitest.config.ts', options => {
        options.test ??= {}
        options.test.pool = 'threads'
      })
      .apply(text)
    expect(fixed).toContain("pool: 'threads'")
    expect(fixed).toContain('mergeConfig(')
  })

  it('keeps the trailing commas of a config whose objects are all indented', () => {
    expect.hasAssertions()
    const text = "import viteConfig from './vite.config.ts'\n\nexport default mergeConfig(\n  viteConfig,\n  defineConfig({\n    test: {\n      globals: true,\n    },\n  }),\n)\n"
    const fixed = fixer
      .config('vitest.config.ts', options => {
        options.test ??= {}
        options.test.pool = 'threads'
      })
      .apply(text)
    expect(fixed).toContain("      pool: 'threads',\n    },")
  })

  it('adds no blank line around what it rewrites', () => {
    expect.hasAssertions()
    const text = "export default defineConfig({\n  test: {\n    coverage: {\n      include: ['src'],\n    },\n    pool: 'threads',\n    projects: [],\n  },\n})\n"
    const fixed = fixer
      .config('vitest.config.ts', options => {
        setOption(options.test as Record<string, unknown>, 'globals', true)
      })
      .apply(text)
    expect(fixed).toBe("export default defineConfig({\n  test: {\n    coverage: {\n      include: ['src'],\n    },\n    globals: true,\n    pool: 'threads',\n    projects: [],\n  },\n})\n")
  })

  it('leaves an exported variable and a call without options as they are', () => {
    expect.hasAssertions()
    expect(fixer.config('vitest.config.ts', () => void 0).apply('const config = {}\nexport default config\n')).toBe('const config = {}\nexport default config\n')
    expect(fixer.config('vitest.config.ts', () => void 0).apply('export default defineConfig(base)\n')).toBe('export default defineConfig(base)\n')
  })

  it('leaves a file it cannot read as it is', () => {
    expect.hasAssertions()
    expect(fixer.config('vitest.config.ts', () => void 0).apply('export const config = {}')).toBe('export const config = {}')
  })
})

/**
 * Set a key of the options a config file exports
 * @param code the body of the exported object
 * @param key the key
 * @param value the value
 * @returns the code of the file after the change
 */
function setIn(code: string, key: string, value: unknown) {
  return fixer
    .config('a.config.ts', options => {
      setOption(options, key, value)
    })
    .apply(`export default {\n${code}\n}\n`)
    .replace(/;\n$/u, '\n')
}

describe(setOption, () => {
  it('puts a new key at its sorted place when the keys are sorted', () => {
    expect.hasAssertions()
    expect(setIn('  alpha: 1,\n  gamma: 3,', 'beta', 2)).toBe('export default {\n  alpha: 1,\n  beta: 2,\n  gamma: 3,\n}\n')
    expect(setIn('  beta: 2,\n  gamma: 3,', 'alpha', 1)).toBe('export default {\n  alpha: 1,\n  beta: 2,\n  gamma: 3,\n}\n')
    expect(setIn('  alpha: 1,', 'beta', 2)).toBe('export default {\n  alpha: 1,\n  beta: 2,\n}\n')
  })

  it('appends a new key when the keys are not sorted or an entry has no key', () => {
    expect.hasAssertions()
    expect(setIn('  gamma: 3,\n  alpha: 1,', 'beta', 2)).toBe('export default {\n  gamma: 3,\n  alpha: 1,\n  beta: 2,\n}\n')
    expect(setIn('  ...base,\n  gamma: 3,', 'beta', 2)).toBe('export default {\n  ...base,\n  gamma: 3,\n  beta: 2,\n}\n')
  })

  it('keeps the place of a key that is there, and reads numbers and quoted keys', () => {
    expect.hasAssertions()
    expect(setIn('  alpha: 1,\n  beta: 2,', 'alpha', 5)).toBe('export default {\n  alpha: 5,\n  beta: 2,\n}\n')
    expect(setIn("  '100': true,\n  gamma: 3,", 'beta', 2)).toBe("export default {\n  '100': true,\n  beta: 2,\n  gamma: 3,\n}\n")
    expect(setIn('  100: true,\n  gamma: 3,', 'beta', 2)).toBe('export default {\n  100: true,\n  beta: 2,\n  gamma: 3,\n}\n')
  })
})
