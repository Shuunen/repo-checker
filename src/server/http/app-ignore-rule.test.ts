import type { Actions } from '../actions/actions-contract.ts'
import { app, worksFine } from '../test/app-fixtures.ts'
import type { ScanRunner } from './stream-scan.ts'

describe('ignore rule', () => {
  it('ignores the rule asked for on the project', async () => {
    expect.hasAssertions()
    const ignoreRule = vi.fn<Actions['ignoreRule']>(() => Promise.resolve({ message: 'ignored', ok: true }))
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, ignoreRule }).request('http://127.0.0.1/api/projects/finga/ignore-rule?rule=deploy-down', { headers: { 'x-repo-check': '1' }, method: 'POST' })
    expect(response.status).toBe(200)
    expect(ignoreRule).toHaveBeenCalledWith('finga', 'deploy-down')
  })

  it('passes an empty rule when none is given', async () => {
    expect.hasAssertions()
    const ignoreRule = vi.fn<Actions['ignoreRule']>(() => Promise.resolve({ ok: false, reason: 'no rule' }))
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, ignoreRule }).request('http://127.0.0.1/api/projects/finga/ignore-rule', { headers: { 'x-repo-check': '1' }, method: 'POST' })
    expect(response.status).toBe(409)
    expect(ignoreRule).toHaveBeenCalledWith('finga', '')
  })
})
