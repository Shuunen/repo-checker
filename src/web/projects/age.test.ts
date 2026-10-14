import { describeAge } from './age.ts'

const now = new Date('2026-10-14T12:00:00Z')

describe(describeAge, () => {
  it.each([
    ['2026-10-01T10:00:00Z', 'this month', false],
    ['2026-12-01T10:00:00Z', 'this month', false],
    ['2026-09-30T10:00:00Z', '1 month ago', false],
    ['2026-01-05T10:00:00Z', '9 months ago', false],
    ['2025-11-05T10:00:00Z', '11 months ago', false],
    ['2025-10-05T10:00:00Z', '1 year ago', true],
    ['2022-04-01T00:00:00Z', '4 years ago', true],
  ] as const)('says %s is %s', (date, label, isStale) => {
    expect.hasAssertions()
    expect(describeAge(date, now)).toStrictEqual({ isStale, label })
  })
})
