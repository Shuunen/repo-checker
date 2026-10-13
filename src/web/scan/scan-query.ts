import { queryOptions, experimental_streamedQuery as streamedQuery } from '@tanstack/react-query'
import { readScanEvents } from './read-events.ts'
import { initialScanState, reduceScan } from './scan-state.ts'

/** Start the scan request, `fetch` in the page and a fake in tests */
export type FetchScan = (signal: AbortSignal) => Promise<Response>

/** The cache key of the scan, an action refetches it to show what it changed */
export const scanQueryKey = ['scan']

/**
 * Request the scan stream from the server
 * @param signal aborts the request when the query is cancelled
 * @returns the response
 */
const fetchScan: FetchScan = signal => fetch('/api/scan', { signal })

/**
 * Open the scan stream, failing when the server does not answer with a body
 * @param request starts the request
 * @param signal aborts the request
 * @returns the scan events
 * @throws {Error} when the server answers with an error status
 */
async function openScan(request: FetchScan, signal: AbortSignal) {
  const response = await request(signal)
  if (!response.ok || response.body === null) throw new Error(`the server did not start the scan (HTTP ${response.status})`)
  return readScanEvents(response.body)
}

/**
 * The scan as a query: the events fold into a `ScanState` as they arrive, a refetch starts a new scan from an empty state
 * @param request starts the request, `fetch` by default
 * @returns the query options
 * @example const { data, refetch } = useQuery(scanQuery())
 */
export function scanQuery(request = fetchScan) {
  return queryOptions({
    queryFn: streamedQuery({ initialValue: initialScanState, reducer: reduceScan, refetchMode: 'reset', streamFn: ({ signal }) => openScan(request, signal) }),
    queryKey: scanQueryKey,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
}
