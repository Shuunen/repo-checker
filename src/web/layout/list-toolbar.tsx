import { SearchField } from '@heroui/react'
import { plural } from '../../shared/text.ts'

/** What `ListToolbar` shows and does */
interface ListToolbarProps {
  /** Called with the text typed */
  onSearch: (search: string) => void
  search: string
  shown: number
  total: number
}

/**
 * The toolbar above the table: a search field on the project name and how many of the projects of the filter are listed
 * @param props the props
 * @returns the toolbar
 */
export function ListToolbar({ onSearch, search, shown, total }: Readonly<ListToolbarProps>) {
  return (
    <div className="flex items-center gap-4" data-testid="list-toolbar">
      <SearchField aria-label="Search projects" className="w-80" onChange={onSearch} value={search}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input data-testid="search-input" placeholder="Search projects…" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      <p className="text-sm text-muted" data-testid="result-count">
        {shown} of {plural(total, 'project')}
      </p>
    </div>
  )
}
