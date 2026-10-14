import { aFinding, aProject } from '../fixtures.ts'
import { applyView, foldableCount, initialListView } from './list-view.ts'

const archived = aProject('old', [], { github: { ...aProject('old').project.github, isArchived: true } as never })
const results = [aProject('broken', [aFinding({ severity: 'error' })]), aProject('meh', [aFinding()]), aProject('fine'), archived]

describe(applyView, () => {
  it('folds the archived projects with nothing to report in the initial view', () => {
    expect.hasAssertions()
    expect(applyView(results, 'overview', initialListView).map(result => result.project.name)).toStrictEqual(['broken', 'meh', 'fine'])
  })

  it('lists them once shown, in the Archived filter and in the all good bucket', () => {
    expect.hasAssertions()
    expect(applyView(results, 'overview', { ...initialListView, isArchivedShown: true })).toHaveLength(4)
    expect(applyView(results, 'archived', initialListView)).toHaveLength(4)
    expect(applyView(results, 'overview', { ...initialListView, bucket: 'quiet' }).map(result => result.project.name)).toStrictEqual(['fine', 'old'])
  })

  it('keeps the projects of the picked bucket', () => {
    expect.hasAssertions()
    expect(applyView(results, 'overview', { ...initialListView, bucket: 'warning' }).map(result => result.project.name)).toStrictEqual(['meh'])
  })
})

describe('the search of a view', () => {
  it('keeps the projects whose name holds the text, case and spaces ignored', () => {
    expect.hasAssertions()
    expect(applyView(results, 'overview', { ...initialListView, search: ' BRO ' }).map(result => result.project.name)).toStrictEqual(['broken'])
  })
})

describe(foldableCount, () => {
  it('counts the folded projects, none when the filter asks for them', () => {
    expect.hasAssertions()
    expect(foldableCount(results, 'overview', initialListView)).toBe(1)
    expect(foldableCount(results, 'archived', initialListView)).toBe(0)
    expect(foldableCount(results, 'overview', { ...initialListView, bucket: 'quiet' })).toBe(0)
  })
})
