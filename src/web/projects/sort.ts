import type { ProjectRow } from './rows.ts'

/** The columns of the table that sort the rows, every one but Actions */
export const sortColumns = ['project', 'visibility', 'state', 'health', 'branch', 'lastPush'] as const

/** One sortable column */
export type SortColumn = (typeof sortColumns)[number]

/** How the rows are ordered */
export interface Sort {
  /** The column that orders the rows */
  column: SortColumn
  /** Ascending is A to Z, the oldest push first and the worst health first */
  direction: 'ascending' | 'descending'
}

/** The order when the page opens: the worst health first */
export const initialSort: Sort = { column: 'health', direction: 'ascending' }

/**
 * What a row is compared on for a column, undefined when the row has nothing there (a dash)
 * @param row the row
 * @param column the column
 * @returns the key
 */
function sortKey(row: Readonly<ProjectRow>, column: SortColumn) {
  const keys: Readonly<Record<SortColumn, number | string | undefined>> = {
    branch: row.branch === '—' ? undefined : row.branch,
    health: row.rank,
    lastPush: row.lastPush === '—' ? undefined : row.lastPush,
    project: row.name,
    state: row.state?.label,
    visibility: row.visibility?.label,
  }
  return keys[column]
}

/**
 * Compare two keys, text with locale rules
 * @param first the first key
 * @param second the second key
 * @returns negative when the first goes first
 */
function compareKeys(first: number | string, second: number | string) {
  return typeof first === 'number' && typeof second === 'number' ? first - second : String(first).localeCompare(String(second))
}

/**
 * Order rows by a column: a row with nothing in the column goes last whatever the direction, ties go by name
 * @param rows the rows
 * @param sort the column and the direction
 * @returns the ordered rows
 * @example sortRows(rows, { column: 'lastPush', direction: 'descending' })
 */
export function sortRows(rows: readonly ProjectRow[], sort: Readonly<Sort>) {
  const sign = sort.direction === 'ascending' ? 1 : -1
  return rows.toSorted((first, second) => {
    const firstKey = sortKey(first, sort.column)
    const secondKey = sortKey(second, sort.column)
    if (firstKey === undefined || secondKey === undefined) return Number(firstKey === undefined) - Number(secondKey === undefined) || first.name.localeCompare(second.name)
    return compareKeys(firstKey, secondKey) * sign || first.name.localeCompare(second.name)
  })
}
