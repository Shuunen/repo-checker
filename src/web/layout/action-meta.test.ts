import { aProject } from '../fixtures.ts'
import { actionMeta } from './action-meta.ts'

describe(actionMeta, () => {
  it('names the default branch in the checkout label', () => {
    expect.hasAssertions()
    const { project } = aProject('app')
    expect(actionMeta('checkout-default', project).label).toBe(`Checkout ${project.github?.defaultBranch} branch`)
  })

  it('falls back to default without GitHub repo', () => {
    expect.hasAssertions()
    const { project } = aProject('app', [], { github: undefined })
    expect(actionMeta('checkout-default', project).label).toBe('Checkout default branch')
  })
})
