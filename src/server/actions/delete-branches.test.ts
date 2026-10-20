import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { BranchState, LocalClone } from '../../shared/project.ts'
import type { GhRunner } from '../inventory/github.ts'
import type { ShellResult } from '../inventory/shell.ts'
import type { GitReaders } from './action-options.ts'
import { deleteLocalBranches, previewDeleteBranches } from './delete-branches.ts'

const apiRepo = (fields: Readonly<Record<string, unknown>> = {}) => ({ archived: false, default_branch: 'master', fork: false, name: 'finga', owner: { login: 'Owner' }, private: false, pushed_at: '2026-01-01T00:00:00Z', ...fields })
const fakeGh = (repo: Readonly<Record<string, unknown>> | undefined) => vi.fn<GhRunner>(() => Promise.resolve(repo === undefined ? { ok: false, stderr: 'HTTP 404: Not Found', stdout: '' } : { ok: true, stderr: '', stdout: JSON.stringify(repo) }))
const aBranch = (fields: Partial<BranchState> = {}): BranchState => ({ ahead: 0, behind: 0, isGone: false, name: 'master', upstream: 'origin/master', ...fields })
const aClone = (fields: Partial<LocalClone> = {}) =>
  ({ branches: [], changedFiles: [], currentBranch: 'master', fetchFailed: false, folderName: 'finga', localOnlyBranches: [], origin: undefined, path: '/projects/finga', problem: undefined, slug: 'owner/finga', stashes: [], unpushed: [], ...fields }) satisfies LocalClone
const fakeReaders = (clone: LocalClone, clones = [clone]): GitReaders => ({ readClone: () => Promise.resolve(clone), readClones: () => Promise.resolve(clones) })
const fakeGit = (failing = '') => vi.fn<(args: readonly string[], cwd: string) => Promise<ShellResult>>(args => Promise.resolve(args.join(' ').includes(failing) && failing !== '' ? { ok: false, stderr: 'boom', stdout: '' } : { ok: true, stderr: '', stdout: '' }))
const clone = aClone({ branches: [aBranch(), aBranch({ name: 'feature', upstream: undefined }), aBranch({ ahead: 2, name: 'wip', upstream: 'origin/wip' }), aBranch({ name: 'merged', upstream: 'origin/merged' }), aBranch({ name: 'current' })], currentBranch: 'current' })

/**
 * Create a folder of projects, removed when the test ends
 * @returns the folder path
 */
async function makeTarget() {
  const target = await mkdtemp(path.join(tmpdir(), 'repo-check-delete-branches-'))
  onTestFinished(() => rm(target, { force: true, recursive: true }))
  return target
}

/**
 * Preview the list of a clone
 * @param cloned the clone
 * @returns the preview
 */
async function previewOf(cloned: LocalClone) {
  return previewDeleteBranches({ gh: fakeGh(apiRepo()), git: fakeReaders(cloned), name: 'finga', owner: 'Owner', target: await makeTarget() })
}

/**
 * Delete the branches of a clone with the fingerprint of its own preview, unless another is given
 * @param cloned the clone
 * @param runGit runs git
 * @param fingerprint the fingerprint to send
 * @returns the result
 */
async function deleteOf(cloned: LocalClone, runGit: ReturnType<typeof fakeGit>, fingerprint?: string) {
  const preview = (await previewOf(cloned)) as { fingerprint: string }
  const sent = fingerprint ?? preview.fingerprint
  return deleteLocalBranches({ fingerprint: sent, gh: fakeGh(apiRepo()), git: fakeReaders(cloned), name: 'finga', owner: 'Owner', runGit, target: await makeTarget() })
}

describe(previewDeleteBranches, () => {
  it('lists every local branch but the default and the checked out one, noting the risky ones', async () => {
    expect.hasAssertions()
    await expect(previewOf(clone)).resolves.toMatchObject({ branches: ['feature (no upstream)', 'wip (2 commits not pushed)', 'merged'], ok: true, path: '/projects/finga' })
  })

  it('refuses when there is no branch to delete', async () => {
    expect.hasAssertions()
    const onlyDefault = aClone({ branches: [aBranch()] })
    await expect(previewOf(onlyDefault)).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('no local branch but master') as string })
  })

  it('refuses when the proof fails', async () => {
    expect.hasAssertions()
    await expect(previewOf(aClone({ fetchFailed: true }))).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('git fetch failed') as string })
  })

  it('gives the reason when something throws', async () => {
    expect.hasAssertions()
    const gh = vi.fn<GhRunner>(() => Promise.reject(new Error('offline')))
    await expect(previewDeleteBranches({ gh, git: fakeReaders(clone), name: 'finga', owner: 'Owner', target: await makeTarget() })).resolves.toStrictEqual({ ok: false, reason: 'offline' })
  })

  it('gives the reason when something throws that is not an error', async () => {
    expect.hasAssertions()
    // oxlint-disable-next-line prefer-promise-reject-errors
    const gh = vi.fn<GhRunner>(() => Promise.reject('text'))
    await expect(previewDeleteBranches({ gh, git: fakeReaders(clone), name: 'finga', owner: 'Owner', target: await makeTarget() })).resolves.toStrictEqual({ ok: false, reason: 'text' })
  })
})

describe(deleteLocalBranches, () => {
  it('deletes the listed branches, forced, one after the other', async () => {
    expect.hasAssertions()
    const runGit = fakeGit()
    await expect(deleteOf(clone, runGit)).resolves.toStrictEqual({ message: 'deleted 3 local branches of /projects/finga', ok: true })
    expect(runGit.mock.calls.map(([args]) => args.join(' '))).toStrictEqual(['branch -D -- feature', 'branch -D -- wip', 'branch -D -- merged'])
  })

  it('is refused when the list is not the one the user saw', async () => {
    expect.hasAssertions()
    const runGit = fakeGit()
    await expect(deleteOf(clone, runGit, 'other')).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('not what the dialog listed') as string })
    expect(runGit).not.toHaveBeenCalled()
  })

  it('is refused when the proof fails', async () => {
    expect.hasAssertions()
    const result = await deleteLocalBranches({ fingerprint: 'x', gh: fakeGh(undefined), git: fakeReaders(clone), name: 'finga', owner: 'Owner', runGit: fakeGit(), target: await makeTarget() })
    expect(result).toMatchObject({ ok: false })
  })

  it('reports the branches git fails to delete', async () => {
    expect.hasAssertions()
    await expect(deleteOf(clone, fakeGit('wip'))).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('wip: boom') as string })
  })

  it('runs the real git by default', async () => {
    expect.hasAssertions()
    const real = aClone({ ...clone, path: await makeTarget() })
    const preview = (await previewOf(real)) as { fingerprint: string }
    const result = await deleteLocalBranches({ fingerprint: preview.fingerprint, gh: fakeGh(apiRepo()), git: fakeReaders(real), name: 'finga', owner: 'Owner', target: await makeTarget() })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('could not be deleted') as string })
  })

  it('gives the reason when something throws', async () => {
    expect.hasAssertions()
    const gh = vi.fn<GhRunner>(() => Promise.reject(new TypeError('text')))
    await expect(deleteLocalBranches({ fingerprint: 'x', gh, git: fakeReaders(clone), name: 'finga', owner: 'Owner', runGit: fakeGit(), target: await makeTarget() })).resolves.toStrictEqual({ ok: false, reason: 'text' })
  })

  it('gives the reason when something throws that is not an error', async () => {
    expect.hasAssertions()
    // oxlint-disable-next-line prefer-promise-reject-errors
    const gh = vi.fn<GhRunner>(() => Promise.reject('text'))
    await expect(deleteLocalBranches({ fingerprint: 'x', gh, git: fakeReaders(clone), name: 'finga', owner: 'Owner', runGit: fakeGit(), target: await makeTarget() })).resolves.toStrictEqual({ ok: false, reason: 'text' })
  })
})
