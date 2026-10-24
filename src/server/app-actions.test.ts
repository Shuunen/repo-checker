import type { ActionResult } from '../shared/action.ts'
import type { Actions } from './actions/actions-contract.ts'
import { app, worksFine } from './app-fixtures.ts'
import type { ScanRunner } from './stream-scan.ts'

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

describe('delete fork', () => {
  const post = { headers: { 'x-repo-check': '1' }, method: 'POST' }

  it('says what deleting the fork would remove', async () => {
    expect.hasAssertions()
    const response = await app(vi.fn<ScanRunner>()).request('http://127.0.0.1/api/projects/lib/delete-fork')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({ branches: 1, ok: true, parent: 'them/lib' })
  })

  it('answers 409 with the reason when the fork is not pristine', async () => {
    expect.hasAssertions()
    const refused: ActionResult = { ok: false, reason: 'Owner/lib: a fork of them/lib with work to keep: main is 1 ahead' }
    const actions: Actions = { ...worksFine, previewDeleteFork: () => Promise.resolve(refused) }
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, actions).request('http://127.0.0.1/api/projects/lib/delete-fork')
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toStrictEqual(refused)
  })

  it('deletes the fork and answers its result', async () => {
    expect.hasAssertions()
    const deleteFork = vi.fn<Actions['deleteFork']>(() => Promise.resolve({ message: 'deleted the fork Owner/lib on GitHub', ok: true }))
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, deleteFork }).request('http://127.0.0.1/api/projects/lib/delete-fork', post)
    expect(response.status).toBe(200)
    expect(deleteFork).toHaveBeenCalledWith('lib')
  })

  it('answers 409 with the reason when the delete is refused', async () => {
    expect.hasAssertions()
    const refused: ActionResult = { ok: false, reason: 'the gh token has no delete_repo scope, run: gh auth refresh -s delete_repo' }
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, deleteFork: () => Promise.resolve(refused) }).request('http://127.0.0.1/api/projects/lib/delete-fork', post)
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toStrictEqual(refused)
  })

  it('refuses a delete without the action header, and does not run it', async () => {
    expect.hasAssertions()
    const deleteFork = vi.fn<Actions['deleteFork']>()
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, deleteFork }).request('http://127.0.0.1/api/projects/lib/delete-fork', { method: 'POST' })
    expect(response.status).toBe(403)
    expect(deleteFork).not.toHaveBeenCalled()
  })
})

describe('rescan', () => {
  it('answers the project as it is now', async () => {
    expect.hasAssertions()
    const response = await app(vi.fn<ScanRunner>()).request('http://127.0.0.1/api/projects/finga/rescan')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({ ok: true, target: '/projects' })
  })

  it('answers 409 with the reason when the project cannot be scanned', async () => {
    expect.hasAssertions()
    const refused: ActionResult = { ok: false, reason: 'the target is a single project, actions work on a folder of projects' }
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, rescan: () => Promise.resolve(refused) }).request('http://127.0.0.1/api/projects/finga/rescan')
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toStrictEqual(refused)
  })
})

describe('checkout default', () => {
  it('checks the default branch out and answers its result', async () => {
    expect.hasAssertions()
    const checkoutDefault = vi.fn<Actions['checkoutDefault']>(() => Promise.resolve({ message: 'checked out master', ok: true }))
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, checkoutDefault }).request('http://127.0.0.1/api/projects/lib/checkout-default', { headers: { 'x-repo-check': '1' }, method: 'POST' })
    expect(response.status).toBe(200)
    expect(checkoutDefault).toHaveBeenCalledWith('lib')
  })
})

describe('sync github metadata', () => {
  it('says what would be set on GitHub', async () => {
    expect.hasAssertions()
    const response = await app(vi.fn<ScanRunner>()).request('http://127.0.0.1/api/projects/lib/sync-github-metadata')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ ok: true, proposed: { description: 'A game' } })
  })

  it('sets the description and the homepage the page sends and answers the result', async () => {
    expect.hasAssertions()
    const syncGithubMetadata = vi.fn<Actions['syncGithubMetadata']>(() => Promise.resolve({ message: 'set the description of owner/lib on GitHub', ok: true }))
    const body = JSON.stringify({ description: 'A game', homepage: 'https://lib.app' })
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, syncGithubMetadata }).request('http://127.0.0.1/api/projects/lib/sync-github-metadata', { body, headers: { 'x-repo-check': '1' }, method: 'POST' })
    expect(response.status).toBe(200)
    expect(syncGithubMetadata).toHaveBeenCalledWith('lib', { description: 'A game', homepage: 'https://lib.app' })
  })

  it.each(['', '{', JSON.stringify({ description: 'A game' }), JSON.stringify({ description: 1, homepage: '' })])('refuses a body without both texts: %s', async body => {
    expect.hasAssertions()
    const syncGithubMetadata = vi.fn<Actions['syncGithubMetadata']>()
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, syncGithubMetadata }).request('http://127.0.0.1/api/projects/lib/sync-github-metadata', { body, headers: { 'x-repo-check': '1' }, method: 'POST' })
    expect(response.status).toBe(409)
    expect(syncGithubMetadata).not.toHaveBeenCalled()
  })
})

describe('delete project', () => {
  const post = { headers: { 'x-repo-check': '1' }, method: 'POST' }

  it('says what deleting the project would remove', async () => {
    expect.hasAssertions()
    const response = await app(vi.fn<ScanRunner>()).request('http://127.0.0.1/api/projects/old/delete-project')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({ clone: { ignoredFiles: [], path: '/projects/old', unsaved: [] }, ok: true, repo: 'owner/old' })
  })

  it('deletes the project and answers its result', async () => {
    expect.hasAssertions()
    const deleteProject = vi.fn<Actions['deleteProject']>(() => Promise.resolve({ message: 'deleted the project', ok: true }))
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, deleteProject }).request('http://127.0.0.1/api/projects/old/delete-project', post)
    expect(response.status).toBe(200)
    expect(deleteProject).toHaveBeenCalledWith('old')
  })
})

describe('live', () => {
  it('asks the action to watch the project since the fingerprint the page holds', async () => {
    expect.hasAssertions()
    const live = vi.fn<Actions['live']>(() => Promise.resolve({ changed: false, fingerprint: 'abc', ok: true, remote: 'fresh' }))
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, live }).request('http://127.0.0.1/api/projects/finga/live?since=abc')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({ changed: false, fingerprint: 'abc', ok: true, remote: 'fresh' })
    expect(live).toHaveBeenCalledWith('finga', 'abc')
  })

  it('asks without fingerprint the first time, and answers 409 with the reason when refused', async () => {
    expect.hasAssertions()
    const live = vi.fn<Actions['live']>(() => Promise.resolve({ ok: false, reason: 'the target is a single project' }))
    const response = await app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, live }).request('http://127.0.0.1/api/projects/finga/live')
    expect(response.status).toBe(409)
    expect(live).toHaveBeenCalledWith('finga', '')
  })
})
