import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { FilterId } from '../projects/filters.ts'
import { type FetchScan, scanQuery } from '../scan/scan-query.ts'
import { initialScanState } from '../scan/scan-state.ts'
import { Page } from './page.tsx'
import { Sidebar } from './sidebar.tsx'

/**
 * The project list: the sidebar filters next to the page, filled in as the scan streams
 * @param props the props
 * @param props.request starts the scan request
 * @returns the dashboard
 */
export function Dashboard({ request }: Readonly<{ request: FetchScan | undefined }>) {
  const query = useQuery(scanQuery(request))
  const [filterId, setFilterId] = useState<FilterId>('overview')
  const state = query.data ?? initialScanState
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar active={filterId} onSelect={setFilterId} projects={state.projects} />
      <Page error={query.error} filterId={filterId} isScanning={query.isFetching} onRescan={() => query.refetch()} state={state} />
    </div>
  )
}
