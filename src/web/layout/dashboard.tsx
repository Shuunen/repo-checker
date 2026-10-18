import { useState } from 'react'
import { initialListView } from '../projects/list-view.ts'
import { askFreshScan, type FetchScan } from '../scan/scan-query.ts'
import { AppBar } from './app-bar.tsx'
import { FilterTabs } from './filter-tabs.tsx'
import { Routes } from './routes.tsx'
import { useFilter } from './use-filter.ts'
import { useOpenSingleProject } from './use-open-single-project.ts'
import { useScan } from './use-scan.ts'

/**
 * The app bar and the filter tabs above the current page, the project list or one project, filled in as the scan streams. On a project address only that project is scanned, the scan of every project starts once the list is opened
 * @param props the props
 * @param props.request starts the scan request
 * @returns the dashboard
 */
export function Dashboard({ request }: Readonly<{ request: FetchScan | undefined }>) {
  const { isScanning, query, state } = useScan(request)
  const [filterId, selectFilter] = useFilter()
  const [view, setView] = useState(initialListView)
  useOpenSingleProject(state)
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppBar
        isScanning={isScanning}
        onRescan={() => {
          askFreshScan()
          void query.refetch()
        }}
        state={state}
      />
      <FilterTabs active={filterId} onSelect={selectFilter} projects={state.projects} />
      <Routes error={query.error} filterId={filterId} isScanning={isScanning} onView={setView} state={state} view={view} />
    </div>
  )
}
