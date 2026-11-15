import { plural } from '../../shared/text.ts'

/** How many months make a year */
const monthsPerYear = 12

/** How old a date is, for the list */
interface Age {
  /** True when a year old or more */
  isStale: boolean
  /** Like `this month`, `1 month ago` or `4 years ago` */
  label: string
}

/**
 * Say how long ago a date was, counted in calendar months
 * @param isoDate the date, like `2026-09-18T10:00:00Z`
 * @param now the date to count from
 * @returns the label and whether it is a year old or more
 * @example describeAge('2022-04-01T00:00:00Z', new Date('2026-10-14')) // { isStale: true, label: '4 years ago' }
 */
export function describeAge(isoDate: string, now: Readonly<Date>): Age {
  const date = new Date(isoDate)
  const months = (now.getUTCFullYear() - date.getUTCFullYear()) * monthsPerYear + now.getUTCMonth() - date.getUTCMonth()
  const isStale = months >= monthsPerYear
  if (months <= 0) return { isStale, label: 'this month' }
  if (!isStale) return { isStale, label: `${plural(months, 'month')} ago` }
  return { isStale, label: `${plural(Math.floor(months / monthsPerYear), 'year')} ago` }
}
