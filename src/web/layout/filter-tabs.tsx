import type { ScanProject } from '../../shared/scan-event.ts'
import { type FilterId, filters } from '../projects/filters.ts'
import { FilterTab } from './filter-tab.tsx'

/**
 * The filter tabs under the app bar: one tab per filter with its count
 * @param props the props
 * @param props.active the selected filter
 * @param props.onSelect called with the filter clicked
 * @param props.projects the projects checked so far
 * @returns the tabs
 */
export function FilterTabs({ active, onSelect, projects }: Readonly<{ active: FilterId; onSelect: (id: FilterId) => void; projects: readonly ScanProject[] }>) {
  return (
    <nav aria-label="Filters" className="flex flex-wrap gap-1 px-8 pt-4">
      {filters.map(filter => (
        <FilterTab count={projects.filter(project => filter.matches(project)).length} id={filter.id} isActive={filter.id === active} key={filter.id} label={filter.label} onSelect={onSelect} />
      ))}
    </nav>
  )
}
