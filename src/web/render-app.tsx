import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { App } from './app.tsx'
import type { FetchScan } from './scan/scan-query.ts'

/**
 * Render the app at an address, with a fake scan request, and put the address back when the test ends
 * @param request answers the scan request
 * @param path the address to open
 * @returns the request
 */
export function renderApp(request: FetchScan, path = '/') {
  globalThis.history.pushState({}, '', path)
  onTestFinished(() => {
    globalThis.history.pushState({}, '', '/')
  })
  render(<App client={new QueryClient()} request={request} />)
  return request
}
