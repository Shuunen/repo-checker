import { Table } from '@heroui/react'
import type { Key } from 'react'
import type { ProjectRow } from '../projects/rows.ts'
import type { Sort, SortColumn } from '../projects/sort.ts'
import { ProjectRowView } from './project-row.tsx'

/** The sortable columns, in order, then the Actions column that does not sort */
const columns = [
  { className: '', id: 'project', label: 'Project' },
  { className: 'text-center', id: 'visibility', label: 'Visibility' },
  { className: 'text-center', id: 'state', label: 'State' },
  { className: 'text-center', id: 'health', label: 'Health' },
  { className: '', id: 'branch', label: 'Branch' },
  { className: 'text-center', id: 'lastPush', label: 'Last push' },
] as const satisfies readonly { className: string; id: SortColumn; label: string }[]

/**
 * The label of a sortable column, with the arrow of its direction when it is the sorted one
 * @param label the label
 * @param isCentered true when the column is centered, the label then sits in the middle of the header like its cells
 * @param sortDirection the direction when the column is sorted
 * @returns the header
 */
function columnHeader(label: string, isCentered: boolean, sortDirection: Sort['direction'] | undefined) {
  const className = isCentered ? 'justify-center gap-1' : undefined
  return sortDirection === undefined ? (
    <Table.SortableColumnHeader className={className}>{label}</Table.SortableColumnHeader>
  ) : (
    <Table.SortableColumnHeader className={className} sortDirection={sortDirection}>
      {label}
    </Table.SortableColumnHeader>
  )
}

/** What `ProjectTable` shows and does */
interface ProjectTableProps {
  /** True while the scan streams, the empty table then says it is scanning */
  isScanning: boolean
  /** Called with the new sort */
  onSort: (sort: Sort) => void
  rows: readonly ProjectRow[]
  sort: Sort
  target: string
}

/**
 * The project table, one row per project in the order of the sort, every column but Actions sorts when its header is clicked
 * @param props the props
 * @returns the table
 */
export function ProjectTable({ isScanning, onSort, rows, sort, target }: Readonly<ProjectTableProps>) {
  const handleSort = (descriptor: { column: Key; direction: Sort['direction'] }) => onSort({ column: descriptor.column as SortColumn, direction: descriptor.direction })
  return (
    <Table>
      <Table.ScrollContainer className="overflow-visible">
        <Table.Content aria-label="Projects" onSortChange={handleSort} sortDescriptor={sort}>
          <Table.Header className="sticky top-4 z-10 shadow-[0_-1rem_0_0_var(--background)]">
            {columns.map(column => (
              <Table.Column allowsSorting className={`${column.className} text-sm`} data-testid={`column-${column.id}`} id={column.id} isRowHeader={column.id === 'project'} key={column.id}>
                {({ sortDirection }) => columnHeader(column.label, column.className === 'text-center', sortDirection)}
              </Table.Column>
            ))}
            <Table.Column className="text-center text-sm" id="actions">
              Actions
            </Table.Column>
          </Table.Header>
          <Table.Body items={rows} renderEmptyState={() => (isScanning ? 'Scanning…' : 'No project here')}>
            {row => <ProjectRowView row={row} target={target} />}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}
