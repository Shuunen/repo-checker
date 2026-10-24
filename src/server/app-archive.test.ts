import type { Actions } from './actions/actions-contract.ts'
import { app, worksFine } from './app-fixtures.ts'
import type { ScanRunner } from './stream-scan.ts'

describe('archive', () => {
  it('archives the repo, only with the action header', async () => {
    expect.hasAssertions()
    const archive = vi.fn<Actions['archive']>(() => Promise.resolve({ message: 'archived owner/old on GitHub', ok: true }))
    const actions: Actions = { ...worksFine, archive }
    const refused = await app(vi.fn<ScanRunner>(), import.meta.dirname, actions).request('http://127.0.0.1/api/projects/old/archive', { method: 'POST' })
    expect(refused.status).toBe(403)
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, actions).request('http://127.0.0.1/api/projects/old/archive', { headers: { 'x-repo-check': '1' }, method: 'POST' })
    expect(response.status).toBe(200)
    expect(archive).toHaveBeenCalledExactlyOnceWith('old')
  })

  it('unarchives the repo, only with the action header', async () => {
    expect.hasAssertions()
    const unarchive = vi.fn<Actions['unarchive']>(() => Promise.resolve({ message: 'unarchived owner/old on GitHub', ok: true }))
    const actions: Actions = { ...worksFine, unarchive }
    const refused = await app(vi.fn<ScanRunner>(), import.meta.dirname, actions).request('http://127.0.0.1/api/projects/old/unarchive', { method: 'POST' })
    expect(refused.status).toBe(403)
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, actions).request('http://127.0.0.1/api/projects/old/unarchive', { headers: { 'x-repo-check': '1' }, method: 'POST' })
    expect(response.status).toBe(200)
    expect(unarchive).toHaveBeenCalledExactlyOnceWith('old')
  })
})
