import type { ActionResult } from '../shared/action.ts'
import type { Actions } from './actions/actions.ts'
import { app, worksFine } from './app-fixtures.ts'
import type { ScanRunner } from './app.ts'

describe('actions', () => {
  const post = { headers: { 'x-repo-check': '1' }, method: 'POST' }

  it('runs the clone and answers its result', async () => {
    expect.hasAssertions()
    const clone = vi.fn<Actions['clone']>(() => Promise.resolve({ message: 'cloned owner/finga', ok: true }))
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, clone }).request('http://127.0.0.1/api/projects/finga/clone', post)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({ message: 'cloned owner/finga', ok: true })
    expect(clone).toHaveBeenCalledWith('finga')
  })

  it('answers 409 with the reason when the action is refused', async () => {
    expect.hasAssertions()
    const refused: ActionResult = { ok: false, reason: 'a folder named finga already exists' }
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, clone: () => Promise.resolve(refused) }).request('http://127.0.0.1/api/projects/finga/clone', post)
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toStrictEqual(refused)
  })

  it('refuses a request without the action header, as a web page of another site would send it', async () => {
    expect.hasAssertions()
    const clone = vi.fn<Actions['clone']>()
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, clone }).request('http://127.0.0.1/api/projects/finga/clone', { method: 'POST' })
    expect(response.status).toBe(403)
    expect(clone).not.toHaveBeenCalled()
  })

  it('refuses an action on another host, against DNS rebinding', async () => {
    expect.hasAssertions()
    const clone = vi.fn<Actions['clone']>()
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, clone }).request('http://evil.example/api/projects/finga/clone', post)
    expect(response.status).toBe(403)
    expect(clone).not.toHaveBeenCalled()
  })
})

describe('delete actions', () => {
  const post = { headers: { 'x-repo-check': '1' }, method: 'POST' }
  const refused: ActionResult = { ok: false, reason: 'old/old: archived on GitHub, but the clone holds work that exists nowhere else: 1 unpushed commit' }

  it('says what deleting the clone would remove', async () => {
    expect.hasAssertions()
    const response = await app(vi.fn<ScanRunner>()).request('http://127.0.0.1/api/projects/old/delete-clone')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({ ignoredFiles: ['.env'], ok: true, path: '/projects/old' })
  })

  it('answers 409 with the reason when the delete is not safe', async () => {
    expect.hasAssertions()
    const actions: Actions = { ...worksFine, previewDeleteClone: () => Promise.resolve(refused) }
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, actions).request('http://127.0.0.1/api/projects/old/delete-clone')
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toStrictEqual(refused)
  })

  it('deletes the clone and answers its result', async () => {
    expect.hasAssertions()
    const deleteClone = vi.fn<Actions['deleteClone']>(() => Promise.resolve({ message: 'deleted the clone /projects/old', ok: true }))
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, deleteClone }).request('http://127.0.0.1/api/projects/old/delete-clone', post)
    expect(response.status).toBe(200)
    expect(deleteClone).toHaveBeenCalledWith('old')
  })

  it('answers 409 with the reason when the delete is refused', async () => {
    expect.hasAssertions()
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, deleteClone: () => Promise.resolve(refused) }).request('http://127.0.0.1/api/projects/old/delete-clone', post)
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toStrictEqual(refused)
  })

  it('refuses a delete without the action header, and does not run it', async () => {
    expect.hasAssertions()
    const deleteClone = vi.fn<Actions['deleteClone']>()
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, deleteClone }).request('http://127.0.0.1/api/projects/old/delete-clone', { method: 'POST' })
    expect(response.status).toBe(403)
    expect(deleteClone).not.toHaveBeenCalled()
  })
})

describe('unarchive and push', () => {
  const post = { headers: { 'x-repo-check': '1' }, method: 'POST' }

  it('runs the action and answers its result', async () => {
    expect.hasAssertions()
    const unarchivePush = vi.fn<Actions['unarchivePush']>(() => Promise.resolve({ message: 'pushed 1 branch (master) to owner/old, which is archived again', ok: true }))
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, unarchivePush }).request('http://127.0.0.1/api/projects/old/unarchive-push', post)
    expect(response.status).toBe(200)
    expect(unarchivePush).toHaveBeenCalledWith('old')
  })

  it('answers 409 with the reason when the action is refused', async () => {
    expect.hasAssertions()
    const refused: ActionResult = { ok: false, reason: 'the clone has 1 uncommitted file' }
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, unarchivePush: () => Promise.resolve(refused) }).request('http://127.0.0.1/api/projects/old/unarchive-push', post)
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toStrictEqual(refused)
  })

  it('refuses a request without the action header, and does not run it', async () => {
    expect.hasAssertions()
    const unarchivePush = vi.fn<Actions['unarchivePush']>()
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, unarchivePush }).request('http://127.0.0.1/api/projects/old/unarchive-push', { method: 'POST' })
    expect(response.status).toBe(403)
    expect(unarchivePush).not.toHaveBeenCalled()
  })
})

describe('discard', () => {
  const post = { headers: { 'x-repo-check': '1' }, method: 'POST' }

  it('lists what would be thrown away, with its fingerprint', async () => {
    expect.hasAssertions()
    const response = await app(vi.fn<ScanRunner>()).request('http://127.0.0.1/api/projects/old/discard')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({ fingerprint: 'abc', groups: [{ items: ['master: fix'], title: 'Unpushed commits' }], ok: true, path: '/projects/old' })
  })

  it('answers 409 with the reason when the discard is not offered', async () => {
    expect.hasAssertions()
    const actions: Actions = { ...worksFine, previewDiscard: () => Promise.resolve({ ok: false, reason: 'old/old: not archived' }) }
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, actions).request('http://127.0.0.1/api/projects/old/discard')
    expect(response.status).toBe(409)
  })

  it.each([
    ['?fingerprint=abc', 'abc'],
    ['', ''],
  ])('discards with the fingerprint of the query %s', async (query, fingerprint) => {
    expect.hasAssertions()
    const discard = vi.fn<Actions['discard']>(() => Promise.resolve({ message: 'discarded', ok: true }))
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, discard }).request(`http://127.0.0.1/api/projects/old/discard${query}`, post)
    expect(response.status).toBe(200)
    expect(discard).toHaveBeenCalledWith('old', fingerprint)
  })

  it('answers 409 with the reason when the discard is refused', async () => {
    expect.hasAssertions()
    const refused: ActionResult = { ok: false, reason: 'the unsaved work of the clone is not what the dialog listed any more' }
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, discard: () => Promise.resolve(refused) }).request('http://127.0.0.1/api/projects/old/discard?fingerprint=abc', post)
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toStrictEqual(refused)
  })

  it('refuses a discard without the action header, and does not run it', async () => {
    expect.hasAssertions()
    const discard = vi.fn<Actions['discard']>()
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, discard }).request('http://127.0.0.1/api/projects/old/discard?fingerprint=abc', { method: 'POST' })
    expect(response.status).toBe(403)
    expect(discard).not.toHaveBeenCalled()
  })
})
