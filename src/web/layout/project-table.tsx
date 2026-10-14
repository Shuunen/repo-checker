import { Table } from '@heroui/react'
import type { ProjectRow } from '../projects/rows.ts'
import { ProjectRowView } from './project-row.tsx'

/**
 * The project table, one row per project, the worst first
 * @param props the props
 * @param props.isScanning true while the scan streams, the empty table then says it is scanning
 * @param props.rows the rows of the selected filter
 * @param props.target the folder of projects, where a clone goes
 * @returns the table
 */
export function ProjectTable({ isScanning, rows, target }: Readonly<{ isScanning: boolean; rows: readonly ProjectRow[]; target: string }>) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Projects">
          <Table.Header>
            <Table.Column isRowHeader>Project</Table.Column>
            <Table.Column className="text-center">Visibility</Table.Column>
            <Table.Column className="text-center">State</Table.Column>
            <Table.Column className="text-center">Health</Table.Column>
            <Table.Column>Branch</Table.Column>
            <Table.Column className="text-center">Last push</Table.Column>
            <Table.Column className="text-center">Actions</Table.Column>
          </Table.Header>
          <Table.Body items={rows} renderEmptyState={() => (isScanning ? 'Scanning…' : 'No project here')}>
            {row => <ProjectRowView row={row} target={target} />}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}
