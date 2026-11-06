import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { LocalClone } from '../../shared/project.ts'
import type { GhRunner } from '../inventory/github.ts'
import type { GitReaders } from './action-options.ts'
import { discardClone, previewDiscard } from './discard.ts'
import { apiRepo, fakeGh, fingerprintFor, fingerprintOf, forgetDefaultBranch, git, leftBehindAfter, makeWorkspace, okPreview } from './discard-fixtures.ts'
import { exists } from './guards.ts'

describe(previewDiscard, () => {
  it('lists exactly what would be thrown away, with a fingerprint that holds while nothing changes', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const preview = await okPreview(workspace.git, workspace.target)
    expect(preview.path).toBe(workspace.folder)
    expect(preview.groups).toStrictEqual([
      { items: ['feature: unpushed on feature', 'master: unpushed on master'], title: 'Unpushed commits' },
      { items: ['wip'], title: 'Local-only branches' },
      { items: [' M a.txt', '?? notes.txt'], title: 'Uncommitted files' },
      { items: [expect.stringContaining('saved for later')], title: 'Stashes' },
    ])
    await expect(fingerprintOf(workspace)).resolves.toBe(preview.fingerprint)
  })

  it('changes the fingerprint when the unsaved work changes', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const before = await fingerprintOf(workspace)
    await writeFile(path.join(workspace.folder, 'other.txt'), 'new')
    await expect(fingerprintOf(workspace)).resolves.not.toBe(before)
  })

  it('refuses with the reason of the proof', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const gh = fakeGh({ ...apiRepo, archived: false })
    await expect(previewDiscard({ gh, git: workspace.git, name: 'old', owner: 'Owner', target: workspace.target })).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('is not archived') })
  })

  it('reports an Error thrown while asking GitHub', async () => {
    expect.hasAssertions()
    const { git: readers, target } = await makeWorkspace()
    const gh = vi.fn<GhRunner>(() => Promise.reject(new Error('network down')))
    await expect(previewDiscard({ gh, git: readers, name: 'old', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: 'network down' })
  })

  it('reports a failure that is not an Error', async () => {
    expect.hasAssertions()
    const { git: readers, target } = await makeWorkspace()
    const gh = vi.fn<GhRunner>(() => Promise.reject(new Error('spawn gh ENOENT').message))
    await expect(previewDiscard({ gh, git: readers, name: 'old', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: 'spawn gh ENOENT' })
  })
})

describe(discardClone, () => {
  it('brings the clone back to a clean state: no changed file, no stash', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const { folder, git: readers, target } = workspace
    const result = await discardClone({ fingerprint: await fingerprintOf(workspace), gh: fakeGh(), git: readers, name: 'old', owner: 'Owner', target })
    expect(result).toStrictEqual({ message: `discarded the unsaved work of ${folder}, it is now identical to GitHub`, ok: true })
    await expect(git(folder, 'status', '--porcelain')).resolves.toBe('')
    await expect(git(folder, 'stash', 'list')).resolves.toBe('')
  })

  it('puts every branch on its upstream and deletes the local-only branches', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const { folder, git: readers, target } = workspace
    await discardClone({ fingerprint: await fingerprintOf(workspace), gh: fakeGh(), git: readers, name: 'old', owner: 'Owner', target })
    await expect(git(folder, 'rev-parse', 'HEAD')).resolves.toBe(await git(folder, 'rev-parse', 'origin/master'))
    await expect(git(folder, 'rev-parse', 'feature')).resolves.toBe(await git(folder, 'rev-parse', 'origin/feature'))
    await expect(git(folder, 'branch', '--format=%(refname:short)')).resolves.toBe('feature\nmaster')
  })

  it('removes the changed and untracked files but keeps the ignored ones', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const { folder, git: readers, target } = workspace
    await discardClone({ fingerprint: await fingerprintOf(workspace), gh: fakeGh(), git: readers, name: 'old', owner: 'Owner', target })
    await expect(readFile(path.join(folder, 'a.txt'), 'utf8')).resolves.toBe('a')
    await expect(exists(path.join(folder, 'notes.txt'))).resolves.toBe(false)
    await expect(exists(path.join(folder, '.env'))).resolves.toBe(true)
  })

  it.each([
    ['empty', ''],
    ['wrong', 'not-the-list-the-user-saw'],
  ])('refuses and changes nothing when the fingerprint is %s', async (_name, fingerprint) => {
    expect.hasAssertions()
    const { folder, git: readers, target } = await makeWorkspace()
    const result = await discardClone({ fingerprint, gh: fakeGh(), git: readers, name: 'old', owner: 'Owner', target })
    expect(result).toStrictEqual({ ok: false, reason: 'the unsaved work of the clone is not what the dialog listed any more, nothing was discarded, open the dialog again' })
    await expect(exists(path.join(folder, 'notes.txt'))).resolves.toBe(true)
    await expect(git(folder, 'stash', 'list')).resolves.toContain('saved for later')
  })

  it('refuses when work was added after the dialog listed it', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const fingerprint = await fingerprintOf(workspace)
    await writeFile(path.join(workspace.folder, 'added-later.txt'), 'new')
    const result = await discardClone({ fingerprint, gh: fakeGh(), git: workspace.git, name: 'old', owner: 'Owner', target: workspace.target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('not what the dialog listed any more') })
    await expect(exists(path.join(workspace.folder, 'added-later.txt'))).resolves.toBe(true)
  })

  it.each([
    ['the default branch of GitHub', false, 'master'],
    ['the first branch that exists on GitHub when the default is unknown', true, 'feature'],
  ])('lands on %s when the checked out branch is local-only', async (_name, forgetDefault, landing) => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const { folder } = workspace
    await git(folder, 'checkout', '--quiet', '--force', 'wip')
    await forgetDefaultBranch(folder, forgetDefault)
    const fingerprint = await fingerprintOf(workspace)
    const result = await discardClone({ fingerprint, gh: fakeGh(), git: workspace.git, name: 'old', owner: 'Owner', target: workspace.target })
    expect(result.ok).toBe(true)
    await expect(git(folder, 'rev-parse', '--abbrev-ref', 'HEAD')).resolves.toBe(landing)
    await expect(git(folder, 'branch', '--format=%(refname:short)')).resolves.not.toContain('wip')
  })

  it('refuses when no branch of the clone exists on GitHub, there is nowhere to go back to', async () => {
    expect.hasAssertions()
    const { target } = await makeWorkspace()
    const clone: LocalClone = { branches: [], changedFiles: ['?? x'], currentBranch: 'wip', fetchFailed: false, folderName: 'old', localOnlyBranches: ['wip'], origin: 'git@github.com:Owner/old.git', path: path.join(target, 'old'), problem: undefined, slug: 'owner/old', stashes: [], unpushed: [] }
    const readers = { listClones: vi.fn<GitReaders['listClones']>(() => Promise.resolve([clone])), readClone: vi.fn<GitReaders['readClone']>(() => Promise.resolve(clone)) }
    const fingerprint = await fingerprintFor(readers, target)
    const result = await discardClone({ fingerprint, gh: fakeGh(), git: readers, name: 'old', owner: 'Owner', target })
    expect(result).toStrictEqual({ ok: false, reason: 'no branch of the clone exists on GitHub, so there is nowhere to go back to: delete the clone by hand if it is worthless' })
  })

  it('stops at the first failing git step and says the clone may be half discarded', async () => {
    expect.hasAssertions()
    const { folder, git: real, target } = await makeWorkspace()
    await git(folder, 'stash', 'clear')
    const lying = async (file: string, options: Readonly<{ shouldFetch: boolean }>) => ({ ...(await real.readClone(file, options)), localOnlyBranches: ['wip', 'ghost'] })
    const readers = { listClones: real.listClones, readClone: vi.fn<GitReaders['readClone']>(lying) }
    const fingerprint = await fingerprintFor(readers, target)
    const result = await discardClone({ fingerprint, gh: fakeGh(), git: readers, name: 'old', owner: 'Owner', target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('git branch -D ghost failed') })
    expect(result).toMatchObject({ reason: expect.stringContaining('the clone may be half discarded') })
  })

  it('says what is left when the clone is not clean after the discard', async () => {
    expect.hasAssertions()
    const { git: real, target } = await makeWorkspace()
    let reads = 0
    const readers = {
      listClones: real.listClones,
      readClone: vi.fn<GitReaders['readClone']>(async (file, options) => {
        reads += 1
        const clone = await real.readClone(file, options)
        return leftBehindAfter(clone, reads)
      }),
    }
    const fingerprint = await fingerprintFor(readers, target)
    reads = 1
    const result = await discardClone({ fingerprint, gh: fakeGh(), git: readers, name: 'old', owner: 'Owner', target })
    expect(result).toStrictEqual({ ok: false, reason: 'the discard ran but the clone still holds uncommitted files' })
  })

  it('refuses a repo that is not archived, and touches nothing', async () => {
    expect.hasAssertions()
    const { folder, git: readers, target } = await makeWorkspace()
    const gh = fakeGh({ ...apiRepo, archived: false })
    await expect(discardClone({ fingerprint: 'x', gh, git: readers, name: 'old', owner: 'Owner', target })).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('is not archived') })
    await expect(exists(path.join(folder, 'notes.txt'))).resolves.toBe(true)
  })

  it.each([
    ['an Error', () => Promise.reject(new Error('network down')), 'network down'],
    ['a string', () => Promise.reject(new Error('spawn gh ENOENT').message), 'spawn gh ENOENT'],
  ])('reports %s thrown while asking GitHub', async (_name, fail, reason) => {
    expect.hasAssertions()
    const { git: readers, target } = await makeWorkspace()
    await expect(discardClone({ fingerprint: 'x', gh: vi.fn<GhRunner>(fail), git: readers, name: 'old', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason })
  })
})
