import { SearchField } from '@heroui/react'
import { plural } from '../../shared/text.ts'

/**
 * The toolbar above the table: a search field on the project name and how many of the projects of the filter are listed
 * @param props the props
 * @param props.onSearch called with the text typed
 * @param props.search the text typed
 * @param props.shown how many projects the table lists
 * @param props.total how many projects the filter tab holds
 * @returns the toolbar
 */
export function ListToolbar({ onSearch, search, shown, total }: Readonly<{ onSearch: (search: string) => void; search: string; shown: number; total: number }>) {
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
