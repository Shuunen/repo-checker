import { Button, Chip } from '@heroui/react'
import type { FilterId } from '../projects/filters.ts'

/**
 * One filter tab: the filter label and how many projects it holds
 * @param props the props
 * @param props.count how many projects match
 * @param props.id the filter key
 * @param props.isActive true for the selected filter
 * @param props.label the filter label
 * @param props.onSelect called with the key when clicked
 * @returns the tab
 */
export function FilterTab({ count, id, isActive, label, onSelect }: Readonly<{ count: number; id: FilterId; isActive: boolean; label: string; onSelect: (id: FilterId) => void }>) {
  return (
    <Button data-testid={`filter-${id}`} onPress={() => onSelect(id)} size="sm" variant={isActive ? 'secondary' : 'ghost'}>
      {label}
      <Chip size="sm">{count}</Chip>
    </Button>
  )
}
