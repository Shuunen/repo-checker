import { Chip, Table } from '@heroui/react'
import { Link } from 'wouter'
import type { ProjectRow } from '../projects/rows.ts'
import { ActionButton } from './action-button.tsx'
import { DeleteProjectButton } from './delete-project-button.tsx'

/** The path of each pill icon, drawn on a 24px grid */
const iconPaths = { archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4', lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4' } as const

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
            <Chip color={pill.color} key={pill.label} size="sm" title={pill.hint}>
              {pill.icon !== undefined && (
                <svg aria-hidden="true" fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="12">
                  <path d={iconPaths[pill.icon]} />
                </svg>
              )}
              {pill.label}
            </Chip>
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
