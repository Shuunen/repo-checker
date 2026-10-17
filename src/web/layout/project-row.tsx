import { Table } from '@heroui/react'
import { Link } from 'wouter'
import type { ProjectRow } from '../projects/rows.ts'
import { ExceptionPill } from './exception-pill.tsx'
import { PillView } from './pill-view.tsx'
import { ActionsMenu } from './actions-menu.tsx'

/**
 * One project row: its name (a link to the project view), visibility and state pills (only the exceptions, private and archived), health pill (the health hint lists the messages), branch (a pill when not cloned or off the default branch), last push (how long ago, in warning color when a year old or more), an Actions menu with every action it offers, each opens its confirmation right from the row
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
      <Table.Cell className="text-center">
        <ExceptionPill pill={row.visibility} />
      </Table.Cell>
      <Table.Cell className="text-center">
        <ExceptionPill pill={row.state} />
      </Table.Cell>
      <Table.Cell className="text-center">
        <PillView pill={row.health} />
      </Table.Cell>
      <Table.Cell className="text-muted">{row.branchPill === undefined ? row.branch : <PillView pill={row.branchPill} />}</Table.Cell>
      <Table.Cell className="text-center text-muted">
        <span className={row.isStale ? 'text-warning' : undefined} title={row.lastPush}>
          {row.lastPushAge}
        </span>
      </Table.Cell>
      <Table.Cell className="text-center focus-visible:shadow-none! data-[focus-visible=true]:shadow-none!">
        <ActionsMenu actions={row.actions} project={row.project} target={target} />
      </Table.Cell>
    </Table.Row>
  )
}
