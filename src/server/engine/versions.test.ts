import { compareVersions, declaredDependencies, packageManagerOf, parseSpec, updateKind, withVersion } from './versions.ts'

describe(parseSpec, () => {
  it.each([
    ['1.2.3', { prefix: '', version: '1.2.3' }],
    ['~1.2.3', { prefix: '~', version: '1.2.3' }],
    ['^10.0.1', { prefix: '^', version: '10.0.1' }],
    ['>=1.0.0', { prefix: '>=', version: '1.0.0' }],
    ['=1.0.0', { prefix: '=', version: '1.0.0' }],
    ['v1.0.0', { prefix: '', version: '1.0.0' }],
    ['^1.2.3 || ^2.0.0', { prefix: '^', version: '1.2.3' }],
    ['1.0.0-beta.1', undefined],
    ['workspace:*', undefined],
    ['latest', undefined],
    ['^1', undefined],
    ['github:user/repo', undefined],
  ])('reads %s', (spec, expected) => {
    expect.hasAssertions()
    expect(parseSpec(spec)).toStrictEqual(expected)
  })
})

describe(declaredDependencies, () => {
  it('lists the plain versions of both sections, in file order, and skips what the registry cannot tell', () => {
    expect.hasAssertions()
    const pkg = { dependencies: { alpha: '~1.0.0', local: 'workspace:*' }, devDependencies: { '@scope/beta': '^2.0.0', 'bad name': '1.0.0' } }
    expect(declaredDependencies(pkg)).toStrictEqual([
      { name: 'alpha', prefix: '~', section: 'dependencies', version: '1.0.0' },
      { name: '@scope/beta', prefix: '^', section: 'devDependencies', version: '2.0.0' },
    ])
    expect(declaredDependencies(undefined)).toStrictEqual([])
  })
})

describe(packageManagerOf, () => {
  it.each([
    [{ packageManager: 'pnpm@12.9.1+sha512.abc' }, { name: 'pnpm', version: '12.9.1' }],
    [{ packageManager: 'bun@1.4.2' }, { name: 'bun', version: '1.4.2' }],
    [{ packageManager: 'yarn@4.0.0' }, undefined],
    [{}, undefined],
    [undefined, undefined],
  ])('reads %j', (pkg, expected) => {
    expect.hasAssertions()
    expect(packageManagerOf(pkg)).toStrictEqual(expected)
  })
})

describe(compareVersions, () => {
  it.each([
    ['1.2.3', '1.2.3', 0],
    ['1.2.3', '1.10.0', -1],
    ['2.0.0', '1.99.99', 1],
    ['1.2.3', '1.2.4', -1],
  ])('%s against %s gives %i', (first, second, expected) => {
    expect.hasAssertions()
    expect(compareVersions(first, second)).toBe(expected)
  })
})

describe(updateKind, () => {
  it.each([
    { expected: 'major', latest: '2.0.0', mine: '1.2.3', prefix: '' },
    { expected: 'minor', latest: '1.4.0', mine: '1.2.3', prefix: '' },
    { expected: 'patch', latest: '1.2.9', mine: '1.2.3', prefix: '' },
    { expected: undefined, latest: '1.2.3', mine: '1.2.3', prefix: '' },
    { expected: undefined, latest: '1.9.0', mine: '2.0.0', prefix: '' },
    { expected: 'patch', latest: '1.2.9', mine: '1.2.3', prefix: '=' },
    { expected: undefined, latest: '1.2.9', mine: '1.2.3', prefix: '~' },
    { expected: 'minor', latest: '1.4.0', mine: '1.2.3', prefix: '~' },
    { expected: undefined, latest: '1.9.0', mine: '1.2.3', prefix: '^' },
    { expected: 'major', latest: '2.0.0', mine: '1.2.3', prefix: '^' },
    { expected: undefined, latest: '0.2.9', mine: '0.2.3', prefix: '^' },
    { expected: 'minor', latest: '0.3.0', mine: '0.2.3', prefix: '^' },
    { expected: 'patch', latest: '0.0.4', mine: '0.0.3', prefix: '^' },
    { expected: undefined, latest: '9.0.0', mine: '1.2.3', prefix: '>=' },
  ])('$mine to $latest with the prefix "$prefix" is $expected', ({ expected, latest, mine, prefix }) => {
    expect.hasAssertions()
    expect(updateKind(mine, latest, prefix)).toBe(expected)
  })
})

describe(withVersion, () => {
  it('keeps the range prefix', () => {
    expect.hasAssertions()
    expect(withVersion('~1.2.3', '1.4.0')).toBe('~1.4.0')
    expect(withVersion('1.2.3', '1.4.0')).toBe('1.4.0')
    expect(withVersion('latest', '1.4.0')).toBe('1.4.0')
  })
})
