import { filterById, type FilterId, summaryTiles } from '../projects/filters.ts'
import { applyView, foldableCount, type ListView } from '../projects/list-view.ts'
import { toRows } from '../projects/rows.ts'
import type { ScanState } from '../scan/scan-state.ts'
import { ArchivedFold } from './archived-fold.tsx'
import { HealthBar } from './health-bar.tsx'
import { ProjectTable } from './project-table.tsx'
import { ScanFailure } from './scan-failure.tsx'

/** What the body shows */
interface ScanBodyProps {
  /** The request error, when the scan could not start */
  error: Error | null
  /** The selected filter */
  filterId: FilterId
  /** True while the scan streams */
  isScanning: boolean
  /** Changes the view of the list */
  onView: (view: ListView) => void
  /** The scan state */
  state: ScanState
  /** The view of the list */
  view: ListView
}

/**
 * The page body: the failure when the scan stopped, otherwise the health bar and the table of the selected filter
 * @param props the props
 * @param props.error the request error, when the scan could not start
 * @param props.filterId the selected filter
 * @param props.isScanning true while the scan streams
 * @param props.onView changes the view of the list
 * @param props.state the scan state
 * @param props.view the view of the list
 * @returns the body
 */
export function ScanBody({ error, filterId, isScanning, onView, state, view }: Readonly<ScanBodyProps>) {
  const failure = state.failure ?? error?.message
  if (failure !== undefined) return <ScanFailure message={failure} />
  const inFilter = state.projects.filter(filterById(filterId).matches)
  return (
    <>
      <HealthBar active={view.bucket} onSelect={bucket => onView({ ...view, bucket })} projects={inFilter} tiles={summaryTiles(state.projects)} />
      <ProjectTable isScanning={isScanning} rows={toRows(applyView(inFilter, filterId, view))} target={state.target} />
      <ArchivedFold count={foldableCount(inFilter, filterId, view)} isShown={view.isArchivedShown} onToggle={() => onView({ ...view, isArchivedShown: !view.isArchivedShown })} />
    </>
  )
}
