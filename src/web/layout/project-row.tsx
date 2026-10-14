import { Table } from '@heroui/react'
import { Link } from 'wouter'
import type { ProjectRow } from '../projects/rows.ts'
import { PillView } from './pill-view.tsx'
import { ActionButton } from './action-button.tsx'
import { DeleteProjectButton } from './delete-project-button.tsx'

/**
 * One project row: its name (a link to the project view), status pills with their full message on hover, branch, last push, the first action it offers, its button opens the confirmation right from the row, and a trash icon that deletes the whole project
 * @param props the props
 * @param props.row the row
 * @param props.target the folder of projects, where a clone goes
 * @returns the row
 */
export function ProjectRowView({ row, target }: Readonly<{ row: ProjectRow; target: string }>) {
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
            <PillView key={pill.label} pill={pill} />
          ))}
        </span>
      </Table.Cell>
      <Table.Cell className="text-muted">{row.branch}</Table.Cell>
      <Table.Cell className="text-muted">{row.lastPush}</Table.Cell>
      <Table.Cell>{row.action !== undefined && <ActionButton action={row.action} project={row.project} target={target} />}</Table.Cell>
      <Table.Cell>
        <DeleteProjectButton project={row.project} />
      </Table.Cell>
    </Table.Row>
  )
}
