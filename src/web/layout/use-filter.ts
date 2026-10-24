import { useState } from 'react'
import { useLocation } from 'wouter'
import type { FilterId } from '../projects/filters.ts'

/**
 * The selected filter tab, and how to change it: picking a filter always goes back to the project list
 * @returns the selected filter and the function that selects another one
 * @example const [filterId, selectFilter] = useFilter()
 */
export function useFilter() {
  const [filterId, setFilterId] = useState<FilterId>('overview')
  const [, navigate] = useLocation()
  const selectFilter = (id: FilterId) => {
    setFilterId(id)
    navigate('/')
  }
  return [filterId, selectFilter] as const
}
