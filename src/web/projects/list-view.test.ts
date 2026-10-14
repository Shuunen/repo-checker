import { aFinding, aProject } from '../fixtures.ts'
import { applyView, initialListView } from './list-view.ts'

const results = [aProject('broken', [aFinding({ severity: 'error' })]), aProject('meh', [aFinding()]), aProject('fine')]

describe(applyView, () => {
  it('keeps every project in the initial view', () => {
    expect.hasAssertions()
    expect(applyView(results, initialListView)).toHaveLength(3)
  })

  it('keeps the projects of the picked bucket', () => {
    expect.hasAssertions()
    expect(applyView(results, { ...initialListView, bucket: 'warning' }).map(result => result.project.name)).toStrictEqual(['meh'])
  })
})
