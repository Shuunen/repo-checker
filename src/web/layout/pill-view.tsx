import { Chip } from '@heroui/react'
import { Archive, Lock } from 'lucide-react'
import type { Pill } from '../projects/rows.ts'

/** The icon of each pill icon name */
const icons = { archive: Archive, lock: Lock } as const

/**
 * One status pill, with its icon when it has one
 * @param props the props
 * @param props.pill the pill
 * @returns the pill
 */
export function PillView({ pill }: Readonly<{ pill: Pill }>) {
  const Icon = pill.icon === undefined ? undefined : icons[pill.icon]
  return (
    <Chip color={pill.color} size="sm" title={pill.hint}>
      {Icon !== undefined && <Icon aria-hidden="true" size={12} />}
      {pill.label}
    </Chip>
  )
}
