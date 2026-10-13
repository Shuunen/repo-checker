import type { ScanProject } from '../../shared/scan-event.ts'
import { type FilterId, filters } from '../projects/filters.ts'
import { SidebarEntry } from './sidebar-entry.tsx'

/**
 * The sidebar: the app name, then one entry per filter with its count
 * @param props the props
 * @param props.active the selected filter
 * @param props.onSelect called with the filter clicked
 * @param props.projects the projects checked so far
 * @returns the sidebar
 */
export function Sidebar({ active, onSelect, projects }: Readonly<{ active: FilterId; onSelect: (id: FilterId) => void; projects: readonly ScanProject[] }>) {
  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-separator p-3">
      <p className="mb-4 flex items-center gap-2 px-2 font-semibold">
        <span className="size-4 rounded bg-accent" />
        repo-checker
      </p>
      {filters.map(filter => (
        <SidebarEntry count={projects.filter(project => filter.matches(project)).length} id={filter.id} isActive={filter.id === active} key={filter.id} label={filter.label} onSelect={onSelect} />
      ))}
    </nav>
  )
}
