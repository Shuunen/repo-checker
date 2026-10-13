import { aFinding, aProject } from '../fixtures.ts'
import { filterById, filters, summaryTiles } from './filters.ts'

const notCloned = aFinding({ actions: ['clone'], ruleId: 'not-cloned', scope: 'project', severity: 'info' })
const results = [
  aProject('jozzo', [aFinding({ ruleId: 'archived-with-unsaved-work', scope: 'project', severity: 'error' })]),
  aProject('app', [aFinding({ severity: 'error' })]),
  aProject('finga', [notCloned], { local: undefined }),
  aProject('qbt', [aFinding({ actions: ['delete-fork'], ruleId: 'pristine-fork', scope: 'project', severity: 'info' })]),
  aProject('old', [], { github: { ...aProject('old').project.github, isArchived: true, isFork: true } as never }),
]

describe(filterById, () => {
  it.each([
    ['overview', ['jozzo', 'app', 'finga', 'qbt', 'old']],
    ['attention', ['jozzo', 'app']],
    ['not-cloned', ['finga']],
    ['forks', ['old']],
    ['archived', ['old']],
  ] as const)('%s keeps the right projects', (id, names) => {
    expect.hasAssertions()
    expect(results.filter(result => filterById(id).matches(result)).map(result => result.project.name)).toStrictEqual(names)
  })

  it('falls back on the overview for an unknown id', () => {
    expect.hasAssertions()
    expect(filterById('nope' as never)).toBe(filters[0])
  })
})

describe(summaryTiles, () => {
  it('counts the projects of each tile', () => {
    expect.hasAssertions()
    expect(summaryTiles(results).map(tile => [tile.id, tile.value])).toStrictEqual([
      ['at-risk', 1],
      ['errors', 1],
      ['not-cloned', 1],
      ['pristine-forks', 1],
    ])
  })
})
