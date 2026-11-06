import { QueryClient } from '@tanstack/react-query'
import { sseResponse } from '../fixtures.ts'
import { askFreshScan, askNitpickScan, scanQuery } from './scan-query.ts'

describe(scanQuery, () => {
  it('asks the server for the scan with fetch by default', async () => {
    expect.hasAssertions()
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(sseResponse([{ isNitpick: false, target: '/projects', type: 'started' }])))
    vi.stubGlobal('fetch', fetchMock)
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
    const state = await new QueryClient().fetchQuery(scanQuery())
    expect(fetchMock).toHaveBeenCalledWith('/api/scan', { signal: expect.any(AbortSignal) })
    expect(state.target).toBe('/projects')
  })

  it('asks for a fresh scan once, when the user or an action wants every project checked again', async () => {
    expect.hasAssertions()
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(sseResponse([{ isNitpick: false, target: '/projects', type: 'started' }])))
    vi.stubGlobal('fetch', fetchMock)
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
    askFreshScan()
    await new QueryClient().fetchQuery(scanQuery())
    await new QueryClient().fetchQuery(scanQuery())
    expect(fetchMock.mock.calls.map(([address]) => address)).toStrictEqual(['/api/scan?fresh=true', '/api/scan'])
  })

  it('asks the server to switch the nitpick mode once, with a fresh scan', async () => {
    expect.hasAssertions()
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(sseResponse([{ isNitpick: true, target: '/projects', type: 'started' }])))
    vi.stubGlobal('fetch', fetchMock)
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
    askNitpickScan(true)
    await new QueryClient().fetchQuery(scanQuery())
    await new QueryClient().fetchQuery(scanQuery())
    expect(fetchMock.mock.calls.map(([address]) => address)).toStrictEqual(['/api/scan?fresh=true&nitpick=true', '/api/scan'])
  })
})
