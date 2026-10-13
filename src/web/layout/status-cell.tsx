import { Table } from '@heroui/react'
import type { ProjectRow } from '../projects/rows.ts'
import { Pill } from './pill.tsx'

/**
 * The status cell of a project row: its pills
 * @param props the props
 * @param props.pills the pills
 * @returns the cell
 */
export function StatusCell({ pills }: Readonly<{ pills: ProjectRow['pills'] }>) {
  return (
    <Table.Cell>
      <span className="flex flex-wrap gap-1">
        {pills.map(pill => (
          <Pill key={pill.label} pill={pill} />
        ))}
      </span>
    </Table.Cell>
  )
}
