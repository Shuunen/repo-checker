import { isOlderThan, monthsAgo } from './age.ts'

const now = Date.parse('2026-07-01T00:00:00Z')

describe('age', () => {
  it('counts whole months', () => {
    expect.hasAssertions()
    expect(monthsAgo('2026-01-01T00:00:00Z', now)).toBe(6)
    expect(monthsAgo('2026-06-20T00:00:00Z', now)).toBe(0)
  })

  it('has no age for a future date or a date that cannot be read', () => {
    expect.hasAssertions()
    expect(monthsAgo('2030-01-01T00:00:00Z', now)).toBe(0)
    expect(monthsAgo('nope', now)).toBe(0)
  })

  it('tells if a date is old enough', () => {
    expect.hasAssertions()
    expect(isOlderThan('2026-01-01T00:00:00Z', 6, now)).toBe(true)
    expect(isOlderThan('2026-02-01T00:00:00Z', 6, now)).toBe(false)
    expect(isOlderThan('2000-01-01T00:00:00Z', 6)).toBe(true)
  })
})
