import { Chip, Table } from '@heroui/react'
import { Link } from 'wouter'
import type { ProjectRow } from '../projects/rows.ts'

/**
 * One project row: its name (a link to the project view), status pills with their full message on hover, branch, last push, and the primary action, a link to the project view where it is confirmed
 * @param props the props
 * @param props.row the row
 * @returns the row
 */
export function ProjectRowView({ row }: Readonly<{ row: ProjectRow }>) {
  return (
    <Table.Row data-testid={`row-${row.name}`} id={row.id}>
      <Table.Cell className="font-medium">
        <Link data-testid={`open-${row.name}`} href={row.href}>
          {row.name}
        </Link>
      </Table.Cell>
      <Table.Cell>
        <span className="flex flex-wrap gap-1">
          {row.pills.map(pill => (
            <Chip color={pill.color} key={pill.label} size="sm" title={pill.hint}>
              {pill.label}
            </Chip>
          ))}
        </span>
      </Table.Cell>
      <Table.Cell className="text-muted">{row.branch}</Table.Cell>
      <Table.Cell className="text-muted">{row.lastPush}</Table.Cell>
      <Table.Cell>{row.action !== undefined && <Link href={row.href}>{`${row.action} →`}</Link>}</Table.Cell>
    </Table.Row>
  )
}
