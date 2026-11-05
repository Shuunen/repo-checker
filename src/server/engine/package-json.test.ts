import { dependencyVersion, hasDependency, isPublishable, scriptsMatching } from './package-json.ts'
import { requireProperty } from './require-property.ts'
import { testRule } from './rule-tester.ts'

describe('package.json helpers', () => {
  it('finds a dependency version in dependencies then devDependencies', () => {
    expect.hasAssertions()
    expect(dependencyVersion({ dependencies: { zod: '4' }, devDependencies: { vitest: '5' } }, 'vitest')).toBe('5')
    expect(dependencyVersion({ dependencies: { zod: '4' } }, 'zod')).toBe('4')
  })

  it('tells if a dependency is there, even without package.json', () => {
    expect.hasAssertions()
    expect(hasDependency({ devDependencies: { vitest: '5' } }, 'vitest')).toBe(true)
    expect(hasDependency(undefined, 'vitest')).toBe(false)
  })

  it('lists the scripts matching a pattern', () => {
    expect.hasAssertions()
    expect(scriptsMatching({ scripts: { build: 'tsc', test: 'npm test' } }, /\bnpm\b/u)).toStrictEqual([['test', 'npm test']])
    expect(scriptsMatching(undefined, /\bnpm\b/u)).toStrictEqual([])
  })
})

testRule(requireProperty({ id: 'test-name', key: 'name', severity: 'error' }), {
  invalid: [{ errors: ['missing'], name: 'missing, no fix', pkg: { version: '1.0.0' } }],
  valid: [{ name: 'present', pkg: { name: 'foo' } }, { name: 'no package.json, skipped' }],
})

testRule(requireProperty({ expected: 'x', id: 'test-schema', isFirst: true, key: '$schema', severity: 'warning' }), {
  invalid: [
    { errors: ['missing'], name: 'missing, added first', output: { $schema: 'x', name: 'foo' }, pkg: { name: 'foo' } },
    { errors: ['wrong'], name: 'wrong, replaced in place', output: { $schema: 'x', name: 'foo' }, pkg: { $schema: 'y', name: 'foo' } },
  ],
  valid: [{ name: 'expected value', pkg: { $schema: 'x' } }],
})

describe(isPublishable, () => {
  it.each([
    { expected: true, pkg: { name: 'foo' }, title: 'a public package' },
    { expected: true, pkg: { private: false }, title: 'a package that says it is not private' },
    { expected: false, pkg: { private: true }, title: 'a private package' },
    { expected: false, pkg: undefined, title: 'no package.json' },
  ])('says $expected for $title', ({ expected, pkg }) => {
    expect.hasAssertions()
    expect(isPublishable(pkg)).toBe(expected)
  })
})
