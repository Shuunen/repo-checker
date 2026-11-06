import { aFinding, aProject } from '../fixtures.ts'
import { bucketCounts, bucketLabel, worstBucket } from './health.ts'

describe(worstBucket, () => {
  it.each([
    [[], 'quiet'],
    [[aFinding({ severity: 'info' })], 'info'],
    [[aFinding({ severity: 'info' }), aFinding({ severity: 'warning' })], 'warning'],
    [[aFinding({ severity: 'warning' }), aFinding({ severity: 'error' }), aFinding({ severity: 'info' })], 'error'],
  ] as const)('puts %j in %s', (findings, expected) => {
    expect.hasAssertions()
    expect(worstBucket(findings)).toBe(expected)
  })
})

describe(bucketCounts, () => {
  it('counts every project once, by its worst finding', () => {
    expect.hasAssertions()
    const results = [aProject('a', [aFinding({ severity: 'error' }), aFinding()]), aProject('b', [aFinding()]), aProject('c', [aFinding({ severity: 'info' })]), aProject('d'), aProject('e')]
    expect(bucketCounts(results)).toStrictEqual({ error: 1, info: 1, quiet: 2, warning: 1 })
  })
})

describe(bucketLabel, () => {
  it.each([
    ['error', 1, '1 error'],
    ['warning', 14, '14 warnings'],
    ['info', 5, '5 infos'],
    ['quiet', 32, '32 all good'],
  ] as const)('says %s %i as %s', (bucket, count, expected) => {
    expect.hasAssertions()
    expect(bucketLabel(bucket, count)).toBe(expected)
  })
})
