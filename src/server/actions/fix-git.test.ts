import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { BranchState, LocalClone } from '../../shared/project.ts'
import type { GhRunner } from '../inventory/github.ts'
import type { ShellResult } from '../inventory/shell.ts'
import type { GitReaders } from './action-options.ts'
import { fixGit, previewFixGit } from './fix-git.ts'

const apiRepo = (fields: Readonly<Record<string, unknown>> = {}) => ({ archived: false, default_branch: 'master', fork: false, name: 'finga', owner: { login: 'Owner' }, private: false, pushed_at: '2026-01-01T00:00:00Z', ...fields })
const fakeGh = (repo: Readonly<Record<string, unknown>> | undefined) => vi.fn<GhRunner>(() => Promise.resolve(repo === undefined ? { ok: false, stderr: 'HTTP 404: Not Found', stdout: '' } : { ok: true, stderr: '', stdout: JSON.stringify(repo) }))
const aBranch = (fields: Partial<BranchState> = {}): BranchState => ({ ahead: 0, behind: 0, isGone: false, name: 'master', upstream: 'origin/master', ...fields })
const aClone = (fields: Partial<LocalClone> = {}) =>
  ({ branches: [], changedFiles: [], currentBranch: 'master', fetchFailed: false, folderName: 'finga', localOnlyBranches: [], origin: undefined, path: '/projects/finga', problem: undefined, slug: 'owner/finga', stashes: [], unpushed: [], ...fields }) satisfies LocalClone
const fakeReaders = (clone: LocalClone, clones = [clone]): GitReaders => ({ listClones: () => Promise.resolve(clones), readClone: () => Promise.resolve(clone) })
const fakeGit = (failing = '') => vi.fn<(args: readonly string[], cwd: string) => Promise<ShellResult>>(args => Promise.resolve(args.join(' ').includes(failing) && failing !== '' ? { ok: false, stderr: 'boom', stdout: '' } : { ok: true, stderr: '', stdout: '' }))
const messy = aClone({ branches: [aBranch({ behind: 2 }), aBranch({ isGone: true, name: 'merged', upstream: 'origin/merged' }), aBranch({ name: 'wip', upstream: undefined })], localOnlyBranches: ['merged', 'wip', 'master'], stashes: ['stash@{0}: WIP'] })

/**
 * Create a folder of projects, removed when the test ends
 * @returns the folder path
 */
async function makeTarget() {
  const target = await mkdtemp(path.join(tmpdir(), 'repo-check-fix-git-'))
  onTestFinished(() => rm(target, { force: true, recursive: true }))
  return target
}

/**
 * Preview the plan of a clone
 * @param clone the clone
 * @returns the preview
 */
async function previewOf(clone: LocalClone) {
  return previewFixGit({ gh: fakeGh(apiRepo()), git: fakeReaders(clone), name: 'finga', owner: 'Owner', target: await makeTarget() })
}

/**
 * The fingerprint of the plan of a clone
 * @param clone the clone
 * @returns the fingerprint
 */
async function fingerprintOf(clone: LocalClone) {
  const preview = await previewOf(clone)
  return (preview as { fingerprint: string }).fingerprint
}

/**
 * Fix a clone with the fingerprint of its own preview
 * @param clone the clone
 * @param runGit runs git
 * @param fingerprint the fingerprint to send, the one of the preview by default
 * @returns the result
 */
async function fixOf(clone: LocalClone, runGit: ReturnType<typeof fakeGit>, fingerprint?: string) {
  const sent = fingerprint ?? (await fingerprintOf(clone))
  return fixGit({ fingerprint: sent, gh: fakeGh(apiRepo()), git: fakeReaders(clone), name: 'finga', owner: 'Owner', runGit, target: await makeTarget() })
}

describe(previewFixGit, () => {
  it('plans the branches without upstream but the checked out one, the stashes and the pull', async () => {
    expect.hasAssertions()
    const preview = await previewOf(messy)
    expect(preview).toMatchObject({ branches: ['merged', 'wip'], ok: true, path: '/projects/finga', pull: 'master', stashes: ['stash@{0}: WIP'] })
  })

  it('plans the other branches that are only behind their upstream', async () => {
    expect.hasAssertions()
    const clone = aClone({ branches: [aBranch(), aBranch({ behind: 3, name: 'savers', upstream: 'origin/savers' }), aBranch({ ahead: 1, behind: 1, name: 'diverged' }), aBranch({ behind: 1, isGone: true, name: 'gone' })] })
    await expect(previewOf(clone)).resolves.toMatchObject({ fastForward: ['savers'], ok: true })
  })

  it('plans the merged branches too, but never the default branch nor the checked out one', async () => {
    expect.hasAssertions()
    const clone = aClone({ branches: [aBranch({ isMerged: true }), aBranch({ isMerged: true, name: 'done' }), aBranch({ isMerged: true, name: 'current' }), aBranch({ isMerged: false, name: 'open' })], currentBranch: 'current', localOnlyBranches: ['done'] })
    await expect(previewOf(clone)).resolves.toMatchObject({ branches: ['done'], ok: true })
  })

  it('does not pull a branch with uncommitted files, nor when not on the default branch', async () => {
    expect.hasAssertions()
    const dirty = aClone({ branches: [aBranch({ behind: 1 })], changedFiles: ['?? a'], stashes: ['s'] })
    const onFeature = aClone({ branches: [aBranch({ behind: 1, name: 'feat' })], currentBranch: 'feat', stashes: ['s'] })
    await expect(previewOf(dirty)).resolves.toMatchObject({ pull: undefined })
    await expect(previewOf(onFeature)).resolves.toMatchObject({ pull: undefined })
  })

  it.each([
    { clone: aClone(), reason: 'no git issue', title: 'a clone with nothing to fix' },
    { clone: aClone({ problem: 'no-origin' }), reason: 'cannot be read', title: 'an unreadable clone' },
    { clone: aClone({ fetchFailed: true }), reason: 'git fetch failed', title: 'a failed fetch' },
  ])('refuses $title', async ({ clone, reason }) => {
    expect.hasAssertions()
    const preview = await previewOf(clone)
    expect(preview).toMatchObject({ ok: false, reason: expect.stringContaining(reason) as string })
  })

  it.each([
    { name: 'finga', reason: 'does not exist on GitHub any more', repo: undefined },
    { name: 'finga', reason: 'is archived now', repo: apiRepo({ archived: true }) },
  ])('refuses $reason', async ({ name, reason, repo }) => {
    expect.hasAssertions()
    const preview = await previewFixGit({ gh: fakeGh(repo), git: fakeReaders(messy), name, owner: 'Owner', target: await makeTarget() })
    expect(preview).toMatchObject({ ok: false, reason: expect.stringContaining(reason) as string })
  })

  it('refuses when there is not exactly one clone', async () => {
    expect.hasAssertions()
    const preview = await previewFixGit({ gh: fakeGh(apiRepo()), git: fakeReaders(messy, []), name: 'finga', owner: 'Owner', target: await makeTarget() })
    expect(preview).toMatchObject({ ok: false, reason: expect.stringContaining('no clone of') as string })
  })

  it('refuses when the folder of projects is not usable', async () => {
    expect.hasAssertions()
    const target = await makeTarget()
    await mkdir(path.join(target, '.git'))
    const preview = await previewFixGit({ gh: fakeGh(apiRepo()), git: fakeReaders(messy), name: 'finga', owner: 'Owner', target })
    expect(preview).toMatchObject({ ok: false, reason: expect.stringContaining('single project') as string })
  })

  it('gives the reason when something throws', async () => {
    expect.hasAssertions()
    const gh = vi.fn<GhRunner>(() => Promise.reject(new Error('offline')))
    await expect(previewFixGit({ gh, git: fakeReaders(messy), name: 'finga', owner: 'Owner', target: await makeTarget() })).resolves.toStrictEqual({ ok: false, reason: 'offline' })
  })

  it('gives the reason when something throws that is not an error', async () => {
    expect.hasAssertions()
    // oxlint-disable-next-line prefer-promise-reject-errors
    const gh = vi.fn<GhRunner>(() => Promise.reject('text'))
    await expect(previewFixGit({ gh, git: fakeReaders(messy), name: 'finga', owner: 'Owner', target: await makeTarget() })).resolves.toStrictEqual({ ok: false, reason: 'text' })
  })
})

describe(fixGit, () => {
  it('pulls, drops the stashes and deletes the branches, forcing only the ones whose upstream is gone', async () => {
    expect.hasAssertions()
    const runGit = fakeGit()
    await expect(fixOf(messy, runGit)).resolves.toStrictEqual({ message: 'fixed the git issues of /projects/finga', ok: true })
    expect(runGit.mock.calls.map(([args]) => args.join(' '))).toStrictEqual(['pull --ff-only', 'stash clear', 'branch -D -- merged', 'branch -D -- wip'])
  })

  it('moves the other behind branches forward without checkout, and stops when git refuses', async () => {
    expect.hasAssertions()
    const clone = aClone({ branches: [aBranch(), aBranch({ behind: 3, name: 'savers', upstream: 'origin/team/savers' })] })
    const runGit = fakeGit()
    await expect(fixOf(clone, runGit)).resolves.toStrictEqual({ message: 'fixed the git issues of /projects/finga', ok: true })
    expect(runGit.mock.calls.map(([args]) => args.join(' '))).toStrictEqual(['fetch origin team/savers:savers'])
    const refused = await fixOf(clone, fakeGit('fetch'))
    expect(refused).toMatchObject({ ok: false, reason: expect.stringContaining('could not be moved forward: savers: boom') as string })
  })

  it('does nothing it was not asked', async () => {
    expect.hasAssertions()
    const runGit = fakeGit()
    await fixOf(aClone({ stashes: ['s'] }), runGit)
    expect(runGit.mock.calls.map(([args]) => args.join(' '))).toStrictEqual(['stash clear'])
  })

  it('is refused when the plan is not the one the user saw', async () => {
    expect.hasAssertions()
    const runGit = fakeGit()
    await expect(fixOf(messy, runGit, 'other')).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('not what the dialog listed') as string })
    expect(runGit).not.toHaveBeenCalled()
  })

  it('is refused when the proof fails', async () => {
    expect.hasAssertions()
    const result = await fixGit({ fingerprint: 'x', gh: fakeGh(undefined), git: fakeReaders(messy), name: 'finga', owner: 'Owner', runGit: fakeGit(), target: await makeTarget() })
    expect(result).toMatchObject({ ok: false })
  })

  it('stops at a pull that fails', async () => {
    expect.hasAssertions()
    const runGit = fakeGit('pull')
    await expect(fixOf(messy, runGit)).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('git pull failed: boom') as string })
    expect(runGit).toHaveBeenCalledOnce()
  })

  it('stops at a stash clear that fails', async () => {
    expect.hasAssertions()
    await expect(fixOf(messy, fakeGit('stash'))).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('git stash clear failed') as string })
  })

  it('reports the branches git fails to delete', async () => {
    expect.hasAssertions()
    const runGit = fakeGit('wip')
    await expect(fixOf(messy, runGit)).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('wip: boom') as string })
  })

  it('gives the reason when something throws', async () => {
    expect.hasAssertions()
    const gh = vi.fn<GhRunner>(() => Promise.reject(new TypeError('text')))
    await expect(fixGit({ fingerprint: 'x', gh, git: fakeReaders(messy), name: 'finga', owner: 'Owner', runGit: fakeGit(), target: await makeTarget() })).resolves.toStrictEqual({ ok: false, reason: 'text' })
  })

  it('runs the real git by default', async () => {
    expect.hasAssertions()
    const clone = aClone({ path: await makeTarget(), stashes: ['s'] })
    const result = await fixGit({ fingerprint: await fingerprintOf(clone), gh: fakeGh(apiRepo()), git: fakeReaders(clone), name: 'finga', owner: 'Owner', target: await makeTarget() })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('git stash clear failed') as string })
  })

  it('gives the reason when something throws that is not an error', async () => {
    expect.hasAssertions()
    // oxlint-disable-next-line prefer-promise-reject-errors
    const gh = vi.fn<GhRunner>(() => Promise.reject('text'))
    await expect(fixGit({ fingerprint: 'x', gh, git: fakeReaders(messy), name: 'finga', owner: 'Owner', runGit: fakeGit(), target: await makeTarget() })).resolves.toStrictEqual({ ok: false, reason: 'text' })
  })
})
