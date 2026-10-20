import { app, worksFine } from './app-fixtures.ts'
import type { ScanRunner } from './stream-scan.ts'

describe('the name of the project in a route', () => {
  const post = { headers: { 'x-repo-check': '1' }, method: 'POST' }

  it.each([
    ['POST', 'clone'],
    ['GET', 'delete-clone'],
    ['POST', 'update-project'],
  ])('refuses a name that is not a repo name on %s %s, before any action sees it', async (method, route) => {
    expect.hasAssertions()
    const spy = vi.fn<(name: string) => Promise<never>>()
    const actions = { ...worksFine, clone: spy, previewDeleteClone: spy, startUpdateProject: spy }
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, actions).request(`http://127.0.0.1/api/projects/a%20b/${route}`, { ...post, method })
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toStrictEqual({ ok: false, reason: 'a b is not a repo name' })
    expect(spy).not.toHaveBeenCalled()
  })
})
