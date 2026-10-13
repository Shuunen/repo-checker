import { QueryClient } from '@tanstack/react-query'
import { sseResponse } from '../fixtures.ts'
import { scanQuery } from './scan-query.ts'

describe(scanQuery, () => {
  it('asks the server for the scan with fetch by default', async () => {
    expect.hasAssertions()
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(sseResponse([{ target: '/projects', type: 'started' }])))
    vi.stubGlobal('fetch', fetchMock)
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
    const state = await new QueryClient().fetchQuery(scanQuery())
    expect(fetchMock).toHaveBeenCalledWith('/api/scan', { signal: expect.any(AbortSignal) })
    expect(state.target).toBe('/projects')
  })
})
