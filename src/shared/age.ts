/**
 * Age helpers shared by the checks that look at how old something is.
 * @module
 */

/** A month is 30 days, the checks only need an order of magnitude */
const monthMs = 2_592_000_000

/**
 * Tell how many whole months ago a date was
 * @param date an ISO 8601 date
 * @param now the current time in milliseconds, replaced in tests
 * @returns the months, 0 for a date that cannot be read or that is in the future
 * @example monthsAgo('2020-01-01T00:00:00Z', Date.parse('2020-04-01T00:00:00Z')) // 3
 */
export function monthsAgo(date: string, now = Date.now()) {
  const time = Date.parse(date)
  return Number.isFinite(time) ? Math.max(0, Math.floor((now - time) / monthMs)) : 0
}

/**
 * Tell if a date is at least a number of months old
 * @param date an ISO 8601 date
 * @param months the number of months
 * @param now the current time in milliseconds, replaced in tests
 * @returns true when the date is that old, false for a date that cannot be read
 * @example isOlderThan('2020-01-01T00:00:00Z', 6) // true
 */
export function isOlderThan(date: string, months: number, now = Date.now()) {
  return monthsAgo(date, now) >= months
}
