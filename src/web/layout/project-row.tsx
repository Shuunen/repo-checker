import { Table } from '@heroui/react'
import { Link } from 'wouter'
import type { ProjectRow } from '../projects/rows.ts'
import { PillView } from './pill-view.tsx'
import { ActionsMenu } from './actions-menu.tsx'

/**
 * One project row: its name (a link to the project view), visibility, state and health pills (the health hint lists the messages), branch, last push, an Actions menu with every action it offers, each opens its confirmation right from the row
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
      <Table.Cell className="text-center">{row.visibility === undefined ? <span className="text-muted">—</span> : <PillView pill={row.visibility} />}</Table.Cell>
      <Table.Cell className="text-center">{row.state === undefined ? <span className="text-muted">—</span> : <PillView pill={row.state} />}</Table.Cell>
      <Table.Cell className="text-center">
        <PillView pill={row.health} />
      </Table.Cell>
      <Table.Cell className="text-muted">{row.branch}</Table.Cell>
      <Table.Cell className="text-center text-muted">{row.lastPush}</Table.Cell>
      <Table.Cell className="text-center focus-visible:shadow-none! data-[focus-visible=true]:shadow-none!">
        <ActionsMenu actions={row.actions} project={row.project} target={target} />
      </Table.Cell>
    </Table.Row>
  )
}
