import { type FilterId, filterById } from '../projects/filters.ts'
import type { ListView } from '../projects/list-view.ts'
import type { ScanState } from '../scan/scan-state.ts'
import { ScanBody } from './scan-body.tsx'
import { ScanHeader } from './scan-header.tsx'

/** What the page shows */
interface PageProps {
  /** The request error, when the scan could not start */
  error: Error | null
  /** The selected filter */
  filterId: FilterId
  /** True while the scan streams */
  isScanning: boolean
  /** Starts a new scan */
  onRescan: () => void
  /** Changes the view of the list */
  onView: (view: ListView) => void
  /** The scan state */
  state: ScanState
  /** The view of the list */
  view: ListView
}

/**
 * The main part of the page: the header, then the health bar and the table of the selected filter
 * @param props the props
 * @param props.error the request error
 * @param props.filterId the selected filter
 * @param props.isScanning true while the scan streams
 * @param props.onRescan starts a new scan
 * @param props.onView changes the view of the list
 * @param props.state the scan state
 * @param props.view the view of the list
 * @returns the main element
 */
export function Page({ error, filterId, isScanning, onRescan, onView, state, view }: Readonly<PageProps>) {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-8">
      <ScanHeader isScanning={isScanning} onRescan={onRescan} state={state} title={filterById(filterId).label} />
      <ScanBody error={error} filterId={filterId} isScanning={isScanning} onView={onView} state={state} view={view} />
    </main>
  )
}
