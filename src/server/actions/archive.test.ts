import type { GhRunner } from '../inventory/github.ts'
import { archiveRepo, unarchiveRepo } from './archive.ts'
import { realGit } from './action-options.ts'

const repo = { archived: false, fork: false, name: 'lib', owner: { login: 'Owner' }, private: false, pushed_at: '2024-01-01T00:00:00Z' }

/** What goes on at GitHub */
interface Behavior {
  /** The repo as GitHub answers it before the PATCH, undefined for a 404 */
  before?: Partial<typeof repo>
  /** False for a repo that is not on GitHub */
  hasRepo?: boolean
  /** True when the repo is archived once the PATCH said ok */
  isArchivedAfter?: boolean
  /** The outcome of the PATCH */
  patch?: { ok: boolean; stderr: string }
}

/**
 * A fake gh for the repo `Owner/lib`
 * @param behavior what GitHub does
 * @param behavior.before what GitHub answers for the repo before the PATCH
 * @param behavior.hasRepo false for a repo that is not on GitHub
 * @param behavior.isArchivedAfter true when the repo is archived once the PATCH said ok
 * @param behavior.patch the outcome of the PATCH
 * @returns the fake runner
 */
function fakeGh({ before = {}, hasRepo = true, isArchivedAfter = true, patch = { ok: true, stderr: '' } }: Behavior = {}) {
  let patched: boolean | undefined = undefined
  return vi.fn<GhRunner>(args => {
    const key = args.join(' ')
    if (key.startsWith('api --method PATCH repos/Owner/lib -F archived=')) {
      patched = key.endsWith('true')
      return Promise.resolve({ ...patch, stdout: '' })
    }
    if (key !== 'api repos/Owner/lib') return Promise.resolve({ ok: false, stderr: `unexpected ${key}`, stdout: '' })
    if (!hasRepo) return Promise.resolve({ ok: false, stderr: 'gh: Not Found (HTTP 404)', stdout: '' })
    return Promise.resolve({ ok: true, stderr: '', stdout: JSON.stringify({ ...repo, ...before, ...(patched !== undefined && isArchivedAfter ? { archived: patched } : {}) }) })
  })
}

/**
 * Run the archive on a folder of projects
 * @param gh the fake gh
 * @param name the repo name
 * @returns the result
 */
function archive(gh: GhRunner, name = 'lib') {
  return archiveRepo({ gh, git: realGit, name, owner: 'Owner', target: import.meta.dirname })
}

describe(archiveRepo, () => {
  it('archives the repo and reads it back', async () => {
    expect.hasAssertions()
    const gh = fakeGh()
    await expect(archive(gh)).resolves.toStrictEqual({ message: 'archived Owner/lib on GitHub', ok: true })
    expect(gh).toHaveBeenCalledWith(['api', '--method', 'PATCH', 'repos/Owner/lib', '-F', 'archived=true'])
  })

  it('refuses a name that is a path', async () => {
    expect.hasAssertions()
    const gh = fakeGh()
    await expect(archive(gh, '../lib')).resolves.toStrictEqual({ ok: false, reason: '../lib is not a repo name' })
    expect(gh).not.toHaveBeenCalled()
  })

  it('refuses a repo that is not on GitHub any more', async () => {
    expect.hasAssertions()
    await expect(archive(fakeGh({ hasRepo: false }))).resolves.toStrictEqual({ ok: false, reason: 'Owner/lib does not exist on GitHub any more' })
  })

  it('refuses a repo that was renamed', async () => {
    expect.hasAssertions()
    await expect(archive(fakeGh({ before: { name: 'other' } }))).resolves.toStrictEqual({ ok: false, reason: 'Owner/lib was renamed or moved to owner/other, scan again' })
  })

  it('refuses a repo that is already archived', async () => {
    expect.hasAssertions()
    const gh = fakeGh({ before: { archived: true } })
    await expect(archive(gh)).resolves.toStrictEqual({ ok: false, reason: 'Owner/lib is already archived' })
    expect(gh).not.toHaveBeenCalledWith(expect.arrayContaining(['PATCH']))
  })

  it('gives the reason GitHub refused with', async () => {
    expect.hasAssertions()
    await expect(archive(fakeGh({ patch: { ok: false, stderr: 'HTTP 403\n' } }))).resolves.toStrictEqual({ ok: false, reason: 'GitHub refused to archive Owner/lib: HTTP 403' })
  })

  it('gives the hand command when the repo is not archived once read back', async () => {
    expect.hasAssertions()
    const result = await archive(fakeGh({ isArchivedAfter: false }))
    expect(result).toStrictEqual({ ok: false, reason: 'GitHub said ok but Owner/lib did not change, archive it by hand: gh api --method PATCH repos/Owner/lib -F archived=true' })
  })

  it('reports a gh that fails', async () => {
    expect.hasAssertions()
    const gh = vi.fn<GhRunner>(() => Promise.reject(new Error('gh exploded')))
    await expect(archive(gh)).resolves.toStrictEqual({ ok: false, reason: 'gh exploded' })
  })

  it('reports a gh that fails with something that is not an error', async () => {
    expect.hasAssertions()
    // oxlint-disable-next-line prefer-promise-reject-errors
    const gh = vi.fn<GhRunner>(() => Promise.reject('plain text'))
    await expect(archive(gh)).resolves.toStrictEqual({ ok: false, reason: 'plain text' })
  })

  it('unarchives the repo and reads it back', async () => {
    expect.hasAssertions()
    const gh = fakeGh({ before: { archived: true } })
    await expect(unarchiveRepo({ gh, git: realGit, name: 'lib', owner: 'Owner', target: import.meta.dirname })).resolves.toStrictEqual({ message: 'unarchived Owner/lib on GitHub', ok: true })
    expect(gh).toHaveBeenCalledWith(['api', '--method', 'PATCH', 'repos/Owner/lib', '-F', 'archived=false'])
  })

  it('refuses to unarchive a repo that is not archived', async () => {
    expect.hasAssertions()
    const result = await unarchiveRepo({ gh: fakeGh(), git: realGit, name: 'lib', owner: 'Owner', target: import.meta.dirname })
    expect(result).toStrictEqual({ ok: false, reason: 'Owner/lib is already not archived' })
  })
})
