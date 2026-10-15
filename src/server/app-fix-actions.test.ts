import type { Actions } from './actions/actions-contract.ts'
import { app, worksFine } from './app-fixtures.ts'
import type { ScanRunner } from './app.ts'

describe('fix files', () => {
  const post = { headers: { 'x-repo-check': '1' }, method: 'POST' }

  it('says what the fixes would change, with the fingerprint of the plan', async () => {
    expect.hasAssertions()
    const response = await app(vi.fn<ScanRunner>()).request('http://127.0.0.1/api/projects/app/fix-files')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({ blocked: [], fingerprint: 'abc', installs: [], ok: true, path: '/projects/app', plans: [{ after: 'b', before: 'a', file: 'package.json' }] })
  })

  it('answers 409 with the reason when there is nothing to fix', async () => {
    expect.hasAssertions()
    const actions: Actions = { ...worksFine, previewFixFiles: () => Promise.resolve({ ok: false, reason: 'no file of Owner/app has a fix to apply' }) }
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, actions).request('http://127.0.0.1/api/projects/app/fix-files')
    expect(response.status).toBe(409)
  })

  it.each([
    ['?fingerprint=abc', 'abc'],
    ['', ''],
  ])('fixes with the fingerprint of the query %s', async (query, fingerprint) => {
    expect.hasAssertions()
    const fixFiles = vi.fn<Actions['fixFiles']>(() => Promise.resolve({ message: 'fixed 1 file', ok: true }))
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, fixFiles }).request(`http://127.0.0.1/api/projects/app/fix-files${query}`, post)
    expect(response.status).toBe(200)
    expect(fixFiles).toHaveBeenCalledWith('app', fingerprint)
  })

  it('streams the steps of a fix that commits, then its result', async () => {
    expect.hasAssertions()
    const fixFiles = vi.fn<Actions['fixFiles']>((_name, _fingerprint, run) => {
      run?.onStage?.('checking')
      run?.onStage?.('pushing')
      return Promise.resolve({ message: 'fixed 1 file', ok: true })
    })
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, fixFiles }).request('http://127.0.0.1/api/projects/app/fix-files?fingerprint=abc&commit=true', post)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/x-ndjson')
    await expect(response.text()).resolves.toBe('{"stage":"checking"}\n{"stage":"pushing"}\n{"result":{"message":"fixed 1 file","ok":true}}\n')
    expect(fixFiles).toHaveBeenCalledWith('app', 'abc', { commit: true, onStage: expect.any(Function) })
  })

  it('refuses a fix without the action header, and does not run it', async () => {
    expect.hasAssertions()
    const fixFiles = vi.fn<Actions['fixFiles']>()
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, fixFiles }).request('http://127.0.0.1/api/projects/app/fix-files?fingerprint=abc', { method: 'POST' })
    expect(response.status).toBe(403)
    expect(fixFiles).not.toHaveBeenCalled()
  })
})
