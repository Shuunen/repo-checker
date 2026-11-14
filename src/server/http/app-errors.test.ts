import type { Actions } from '../actions/actions-contract.ts'
import { app, worksFine } from '../test/app-fixtures.ts'
import type { ScanRunner } from './stream-scan.ts'

const post = { headers: { 'x-repo-check': '1' }, method: 'POST' }

describe('an action that throws', () => {
  // Value: protects=an action that throws before it answers is a 409 with its reason; fails_when=the onError handler of the action routes is removed; why_new=a throw used to be a bare 500; seam=none; no_claim=none beyond protects
  it('answers 409 with the reason', async () => {
    expect.hasAssertions()
    const deleteProject = vi.fn<Actions['deleteProject']>(() => Promise.reject(new Error('gh is not logged in')))
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, deleteProject }).request('http://127.0.0.1/api/projects/old/delete-project?fingerprint=jkl', post)
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toStrictEqual({ ok: false, reason: 'gh is not logged in' })
  })

  // Value: protects=the fix-files stream always ends with a result line, even when the action throws; fails_when=stream() stops wrapping the run in attempt; why_new=a throw ended the stream with no result; seam=none; no_claim=none beyond protects
  it('ends the fix-files stream with a refusal', async () => {
    expect.hasAssertions()
    const fixFiles = vi.fn<Actions['fixFiles']>(() => Promise.reject(new Error('gh is not logged in')))
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, fixFiles }).request('http://127.0.0.1/api/projects/old/fix-files?fingerprint=abc&commit=true', post)
    await expect(response.text()).resolves.toBe(`${JSON.stringify({ result: { ok: false, reason: 'gh is not logged in' } })}\n`)
  })
})
