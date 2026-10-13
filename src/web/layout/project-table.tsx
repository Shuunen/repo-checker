import { Table } from '@heroui/react'
import type { ProjectRow } from '../projects/rows.ts'
import { TableHead } from './table-head.tsx'
import { TableRows } from './table-rows.tsx'

/**
 * The project table, one row per project, the worst first
 * @param props the props
 * @param props.isScanning true while the scan streams, the empty table then says it is scanning
 * @param props.rows the rows of the selected filter
 * @returns the table
 */
export function ProjectTable({ isScanning, rows }: Readonly<{ isScanning: boolean; rows: readonly ProjectRow[] }>) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Projects">
          <TableHead />
          <TableRows isScanning={isScanning} rows={rows} />
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}
