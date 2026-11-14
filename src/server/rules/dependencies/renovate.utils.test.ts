import { withSemverAllMonthly } from './renovate.utils.ts'

describe(withSemverAllMonthly, () => {
  it('keeps a list that has it already, so two fixes in a row do not duplicate it', () => {
    expect.hasAssertions()
    expect(withSemverAllMonthly(['config:semverAllMonthly', ':automergeAll'])).toStrictEqual(['config:semverAllMonthly', ':automergeAll'])
  })

  it('replaces config:base and config:recommended', () => {
    expect.hasAssertions()
    expect(withSemverAllMonthly(['config:base', ':automergeAll'])).toStrictEqual(['config:semverAllMonthly', ':automergeAll'])
  })

  it('puts it first otherwise', () => {
    expect.hasAssertions()
    expect(withSemverAllMonthly([':automergeAll'])).toStrictEqual(['config:semverAllMonthly', ':automergeAll'])
  })
})
