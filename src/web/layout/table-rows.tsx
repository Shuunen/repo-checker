import { Table } from '@heroui/react'
import type { ProjectRow } from '../projects/rows.ts'
import { ProjectRowView } from './project-row.tsx'

/**
 * The body of the project table, with a message when there is no row
 * @param props the props
 * @param props.isScanning true while the scan streams, the empty table then says it is scanning
 * @param props.rows the rows of the selected filter
 * @returns the body
 */
export function TableRows({ isScanning, rows }: Readonly<{ isScanning: boolean; rows: readonly ProjectRow[] }>) {
  return (
    <Table.Body items={rows} renderEmptyState={() => (isScanning ? 'Scanning…' : 'No project here')}>
      {row => <ProjectRowView row={row} />}
    </Table.Body>
  )
}
