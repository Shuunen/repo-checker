import { getLive } from './live-project.ts'

describe(getLive, () => {
  it('asks the server for the project since a fingerprint', async () => {
    expect.hasAssertions()
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(Response.json({ changed: false, fingerprint: 'abc', ok: true, remote: 'fresh' })))
    vi.stubGlobal('fetch', fetchMock)
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
    await expect(getLive('my repo', 'a b')).resolves.toStrictEqual({ changed: false, fingerprint: 'abc', ok: true, remote: 'fresh' })
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/my%20repo/live?since=a%20b')
  })

  it.each([
    ['cannot be reached', () => Promise.reject(new Error('offline')), 'the server could not be asked'],
    ['does not answer with JSON', () => Promise.resolve(new Response('oops', { status: 500 })), 'the server answered HTTP 500'],
  ])('refuses when the server %s', async (_name, answer, reason) => {
    expect.hasAssertions()
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(answer))
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
    await expect(getLive('finga', '')).resolves.toStrictEqual({ ok: false, reason })
  })
})
