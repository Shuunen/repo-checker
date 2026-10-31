import { aFinding, aProject } from '../fixtures.ts'
import { toRows } from './rows.ts'
import { initialSort, sortRows } from './sort.ts'

const rows = toRows([
  aProject('bravo', [aFinding({ severity: 'warning' })], { github: { ...aProject('bravo').project.github, isPrivate: true, pushedAt: '2024-01-01T00:00:00Z' } as never }),
  aProject('alpha', [aFinding({ severity: 'error' })]),
  aProject('charlie', [], { github: undefined }),
  aProject('delta', [aFinding({ severity: 'info' })], { local: undefined }),
])
const names = (sorted: readonly { name: string }[]) => sorted.map(row => row.name)

describe(sortRows, () => {
  it('orders the worst health first by default', () => {
    expect.hasAssertions()
    expect(names(sortRows(rows, initialSort))).toStrictEqual(['alpha', 'bravo', 'delta', 'charlie'])
  })

  it('reverses the health order', () => {
    expect.hasAssertions()
    expect(names(sortRows(rows, { column: 'health', direction: 'descending' }))).toStrictEqual(['charlie', 'delta', 'bravo', 'alpha'])
  })

  it('orders by project name in both directions', () => {
    expect.hasAssertions()
    expect(names(sortRows(rows, { column: 'project', direction: 'ascending' }))).toStrictEqual(['alpha', 'bravo', 'charlie', 'delta'])
    expect(names(sortRows(rows, { column: 'project', direction: 'descending' }))).toStrictEqual(['delta', 'charlie', 'bravo', 'alpha'])
  })

  it.each([
    ['lastPush', 'ascending', ['bravo', 'alpha', 'delta', 'charlie']],
    ['lastPush', 'descending', ['alpha', 'delta', 'bravo', 'charlie']],
    ['visibility', 'ascending', ['bravo', 'alpha', 'delta', 'charlie']],
    ['branch', 'ascending', ['alpha', 'bravo', 'charlie', 'delta']],
    ['state', 'descending', ['alpha', 'bravo', 'delta', 'charlie']],
  ] as const)('orders by %s %s, a dash always last', (column, direction, expected) => {
    expect.hasAssertions()
    expect(names(sortRows(rows, { column, direction }))).toStrictEqual(expected)
  })

  it('puts rows with nothing in the column last, by name', () => {
    expect.hasAssertions()
    const dashes = toRows([aProject('echo', [], { github: undefined }), aProject('charlie', [], { github: undefined })])
    expect(names(sortRows(dashes, { column: 'lastPush', direction: 'ascending' }))).toStrictEqual(['charlie', 'echo'])
  })
})
