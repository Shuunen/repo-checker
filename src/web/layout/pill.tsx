import { Chip } from '@heroui/react'
import type { ProjectRow } from '../projects/rows.ts'

/**
 * One status pill, with its full message on hover
 * @param props the props
 * @param props.pill the pill
 * @returns the chip
 */
export function Pill({ pill }: Readonly<{ pill: ProjectRow['pills'][number] }>) {
  return (
    <Chip color={pill.color} size="sm" title={pill.hint}>
      {pill.label}
    </Chip>
  )
}
