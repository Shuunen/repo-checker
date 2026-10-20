import type { ScanProject } from '../../shared/scan-event.ts'
import { type FilterId, filters } from '../projects/filters.ts'
import { FilterTab } from './filter-tab.tsx'

/** What `FilterTabs` shows and does */
interface FilterTabsProps {
  /** The selected filter */
  active: FilterId
  /** Called with the filter clicked */
  onSelect: (id: FilterId) => void
  projects: readonly ScanProject[]
}

/**
 * The filter tabs under the app bar: one tab per filter with its count
 * @param props the props
 * @returns the tabs
 */
export function FilterTabs({ active, onSelect, projects }: Readonly<FilterTabsProps>) {
  return (
    <nav aria-label="Filters" className="flex flex-wrap gap-1 px-8 pt-4">
      {filters.map(filter => (
        <FilterTab count={projects.filter(project => filter.matches(project)).length} id={filter.id} isActive={filter.id === active} key={filter.id} label={filter.label} onSelect={onSelect} />
      ))}
    </nav>
  )
}
