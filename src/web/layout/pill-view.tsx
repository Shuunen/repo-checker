import { Chip } from '@heroui/react'
import type { ProjectRow } from '../projects/rows.ts'

/** The path of each pill icon, drawn on a 24px grid */
const iconPaths = { archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4', lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4' } as const

/**
 * One status pill, with its icon when it has one
 * @param props the props
 * @param props.pill the pill
 * @returns the pill
 */
export function PillView({ pill }: Readonly<{ pill: ProjectRow['pills'][number] }>) {
  return (
    <Chip color={pill.color} size="sm" title={pill.hint}>
      {pill.icon !== undefined && (
        <svg aria-hidden="true" fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="12">
          <path d={iconPaths[pill.icon]} />
        </svg>
      )}
      {pill.label}
    </Chip>
  )
}
