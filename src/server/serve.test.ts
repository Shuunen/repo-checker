import { startServer } from './serve.ts'

describe(startServer, () => {
  it('serves on 127.0.0.1 until closed', async () => {
    expect.hasAssertions()
    const server = await startServer(() => new Response('hello'), 0)
    expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u)
    const response = await fetch(server.url)
    await expect(response.text()).resolves.toBe('hello')
    await server.close()
    await expect(fetch(server.url)).rejects.toThrow('fetch failed')
  })

  it('fails when the port is taken', async () => {
    expect.hasAssertions()
    const first = await startServer(() => new Response(''), 0)
    onTestFinished(() => first.close())
    const port = Number(new URL(first.url).port)
    await expect(startServer(() => new Response(''), port)).rejects.toThrow('EADDRINUSE')
  })
})
