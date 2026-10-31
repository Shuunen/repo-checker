import { Toast } from '@heroui/react'
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Dashboard } from './layout/dashboard.tsx'
import type { FetchScan } from './scan/scan-query.ts'

/** What `App` shows and does */
interface AppProps {
  /** Holds the scan data */
  client: QueryClient
  /** Starts the scan request, `fetch` by default */
  request?: FetchScan | undefined
}

/**
 * The web app
 * @param props the props
 * @returns the app
 */
export function App({ client, request }: Readonly<AppProps>) {
  return (
    <QueryClientProvider client={client}>
      <Dashboard request={request} />
      <Toast.Provider placement="bottom end" />
    </QueryClientProvider>
  )
}
