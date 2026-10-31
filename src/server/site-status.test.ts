import { startServer } from './serve.ts'
import { createSiteStatus, realSiteDeps, type SiteDeps } from './site-status.ts'

/**
 * Build fake dependencies
 * @param statuses the status of each url, a missing url fails
 * @returns the dependencies, with the clock
 */
function fakeSites(statuses: Readonly<Record<string, number>>) {
  const clock = { now: 0 }
  const fetchStatus = vi.fn<SiteDeps['fetchStatus']>(url => Promise.resolve(statuses[url]))
  return { clock, deps: { fetchStatus, now: () => clock.now }, fetchStatus }
}

describe(createSiteStatus, () => {
  it('gives the status of a site, or unreachable when it does not answer', async () => {
    expect.hasAssertions()
    const { deps } = fakeSites({ 'https://a.dev': 200, 'https://b.dev': 503, 'https://github.com': 200 })
    const { statusOf } = createSiteStatus(deps)
    await expect(statusOf('https://a.dev')).resolves.toStrictEqual({ status: 200, url: 'https://a.dev' })
    await expect(statusOf('https://b.dev')).resolves.toStrictEqual({ status: 503, url: 'https://b.dev' })
    await expect(statusOf('https://down.dev')).resolves.toStrictEqual({ status: 'unreachable', url: 'https://down.dev' })
  })

  it('says nothing when the machine is offline, every site would look down', async () => {
    expect.hasAssertions()
    const { deps } = fakeSites({ 'https://a.dev': 200 })
    await expect(createSiteStatus(deps).statusOf('https://a.dev')).resolves.toBeUndefined()
  })

  it('asks a url once every five minutes', async () => {
    expect.hasAssertions()
    const { clock, deps, fetchStatus } = fakeSites({ 'https://a.dev': 200, 'https://github.com': 200 })
    const { statusOf } = createSiteStatus(deps)
    await statusOf('https://a.dev')
    await statusOf('https://a.dev')
    expect(fetchStatus).toHaveBeenCalledTimes(2)
    clock.now = 300_000
    await statusOf('https://a.dev')
    expect(fetchStatus).toHaveBeenCalledTimes(4)
  })
})

describe('real site dependencies', () => {
  it('reads the status of a url, undefined when the request fails', async () => {
    expect.hasAssertions()
    const server = await startServer(request => new Response('hello', { status: Number(new URL(request.url).pathname.slice(1)) }), 0)
    onTestFinished(() => server.close())
    await expect(realSiteDeps.fetchStatus(`${server.url}/200`)).resolves.toBe(200)
    await expect(realSiteDeps.fetchStatus(`${server.url}/404`)).resolves.toBe(404)
    await expect(realSiteDeps.fetchStatus('https://example.invalid')).resolves.toBeUndefined()
  })

  it('gives the current time', () => {
    expect.hasAssertions()
    expect(realSiteDeps.now()).toBeGreaterThan(0)
  })
})
