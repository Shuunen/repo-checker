import { fixer } from './fixer.ts'

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
    expect(fixer.config('vitest.config.ts', options => void (options.test.pool = 'threads')).apply(text)).toContain("pool: 'threads'")
  })

  it('leaves a file it cannot read as it is', () => {
    expect.hasAssertions()
    expect(fixer.config('vitest.config.ts', () => void 0).apply('export const config = {}')).toBe('export const config = {}')
  })
})
