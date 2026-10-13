import { filterById, type FilterId } from '../projects/filters.ts'
import { toRows } from '../projects/rows.ts'
import type { ScanState } from '../scan/scan-state.ts'
import { ProjectTable } from './project-table.tsx'
import { ScanFailure } from './scan-failure.tsx'
import { SummaryTiles } from './summary-tiles.tsx'

/**
 * The page body: the failure when the scan stopped, otherwise the tiles and the table of the selected filter
 * @param props the props
 * @param props.error the request error, when the scan could not start
 * @param props.filterId the selected filter
 * @param props.isScanning true while the scan streams
 * @param props.state the scan state
 * @returns the body
 */
export function ScanBody({ error, filterId, isScanning, state }: Readonly<{ error: Error | null; filterId: FilterId; isScanning: boolean; state: ScanState }>) {
  const failure = state.failure ?? error?.message
  if (failure !== undefined) return <ScanFailure message={failure} />
  return (
    <>
      <SummaryTiles projects={state.projects} />
      <ProjectTable isScanning={isScanning} rows={toRows(state.projects.filter(filterById(filterId).matches))} />
    </>
  )
}
