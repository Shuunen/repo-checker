import { QueryClient } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import { App } from './app.tsx'
import type { FetchScan } from './scan/scan-query.ts'

/**
 * Render the app at an address, with a fake scan request, and put the address back when the test ends. The app opens on the list then goes to the address, like a click would, so the scan of every project runs. A reload scans only the project of a project address
 * @param request answers the scan request
 * @param path the address to open
 * @param isReload true to open the app directly at the address, like a reload of the page
 * @returns the request
 */
export function renderApp(request: FetchScan, path = '/', isReload = false) {
  globalThis.history.pushState({}, '', isReload ? path : '/')
  onTestFinished(() => {
    globalThis.history.pushState({}, '', '/')
  })
  render(<App client={new QueryClient()} request={request} />)
  if (!isReload && path !== '/') act(() => globalThis.history.pushState({}, '', path))
  return request
}
