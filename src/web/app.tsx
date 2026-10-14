import { Toast } from '@heroui/react'
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Dashboard } from './layout/dashboard.tsx'
import type { FetchScan } from './scan/scan-query.ts'

/**
 * The web app
 * @param props the props
 * @param props.client holds the scan data
 * @param props.request starts the scan request, `fetch` by default
 * @returns the app
 */
export function App({ client, request }: Readonly<{ client: QueryClient; request?: FetchScan | undefined }>) {
  return (
    <QueryClientProvider client={client}>
      <Dashboard request={request} />
      <Toast.Provider placement="bottom end" />
    </QueryClientProvider>
  )
}
