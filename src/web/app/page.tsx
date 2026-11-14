import type { FilterId } from '../dashboard/filters.ts'
import type { ListView } from '../dashboard/list-view.ts'
import { ScanBody } from '../dashboard/scan-body.tsx'
import type { ScanState } from '../dashboard/scan-state.ts'

/** What the page shows */
interface PageProps {
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
 * The main part of the page: the health bar and the table of the selected filter
 * @param props the props
 * @returns the main element
 */
export function Page({ error, filterId, isScanning, onView, state, view }: Readonly<PageProps>) {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-8">
      <ScanBody error={error} filterId={filterId} isScanning={isScanning} onView={onView} state={state} view={view} />
    </main>
  )
}
