import { Button, Chip } from '@heroui/react'
import type { FilterId } from '../projects/filters.ts'

/** What `FilterTab` shows and does */
interface FilterTabProps {
  /** How many projects match */
  count: number
  /** The filter key */
  id: FilterId
  /** True for the selected filter */
  isActive: boolean
  /** The filter label */
  label: string
  /** Called with the key when clicked */
  onSelect: (id: FilterId) => void
}

/**
 * One filter tab: the filter label and how many projects it holds
 * @param props the props
 * @returns the tab
 */
export function FilterTab({ count, id, isActive, label, onSelect }: Readonly<FilterTabProps>) {
  return (
    <Button data-testid={`filter-${id}`} onPress={() => onSelect(id)} size="sm" variant={isActive ? 'secondary' : 'ghost'}>
      {label}
      <Chip size="sm">{count}</Chip>
    </Button>
  )
}
