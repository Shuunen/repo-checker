import { Table } from '@heroui/react'
import type { ProjectRow } from '../projects/rows.ts'
import { ActionCell } from './action-cell.tsx'
import { NameCell } from './name-cell.tsx'
import { StatusCell } from './status-cell.tsx'

/**
 * One project row: its name, status pills, branch, last push and primary action
 * @param props the props
 * @param props.row the row
 * @returns the row
 */
export function ProjectRowView({ row }: Readonly<{ row: ProjectRow }>) {
  return (
    <Table.Row data-testid={`row-${row.name}`} id={row.id}>
      <NameCell href={row.href} name={row.name} />
      <StatusCell pills={row.pills} />
      <Table.Cell className="text-muted">{row.branch}</Table.Cell>
      <Table.Cell className="text-muted">{row.lastPush}</Table.Cell>
      <ActionCell label={row.action} />
    </Table.Row>
  )
}
