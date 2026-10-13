import { useQuery } from '@tanstack/react-query'
import { type FetchScan, scanQuery } from '../scan/scan-query.ts'
import { initialScanState } from '../scan/scan-state.ts'
import { Routes } from './routes.tsx'
import { Sidebar } from './sidebar.tsx'
import { useFilter } from './use-filter.ts'
import { useOpenSingleProject } from './use-open-single-project.ts'

/**
 * The sidebar filters next to the current page, the project list or one project, filled in as the scan streams
 * @param props the props
 * @param props.request starts the scan request
 * @returns the dashboard
 */
export function Dashboard({ request }: Readonly<{ request: FetchScan | undefined }>) {
  const query = useQuery(scanQuery(request))
  const [filterId, selectFilter] = useFilter()
  const state = query.data ?? initialScanState
  useOpenSingleProject(state)
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar active={filterId} onSelect={selectFilter} projects={state.projects} />
      <Routes error={query.error} filterId={filterId} isScanning={query.isFetching} onRescan={() => query.refetch()} state={state} />
    </div>
  )
}
