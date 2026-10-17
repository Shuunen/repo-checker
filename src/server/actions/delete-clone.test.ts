import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { LocalClone } from '../../shared/project.ts'
import type { GhRunner } from '../inventory/github.ts'
import { run } from '../inventory/shell.ts'
import { deleteClone, previewDeleteClone } from './delete-clone.ts'
import type { GitReaders } from './action-options.ts'
import { exists } from './guards.ts'

const apiRepo = (fields: Readonly<Record<string, unknown>> = {}) => ({ archived: true, fork: false, name: 'old', owner: { login: 'Owner' }, private: false, pushed_at: '2025-01-01T00:00:00Z', ...fields })

/**
 * A clone as the inventory reads it, clean unless told otherwise
 * @param folder the clone folder
 * @param fields what to change
 * @returns the clone
 */
function aClone(folder: string, fields: Readonly<Partial<LocalClone>> = {}): LocalClone {
  return { branches: [], changedFiles: [], currentBranch: 'master', fetchFailed: false, folderName: path.basename(folder), localOnlyBranches: [], origin: 'git@github.com:Owner/old.git', path: folder, problem: undefined, slug: 'owner/old', stashes: [], unpushed: [], ...fields }
}

/**
 * A fake gh that answers `api repos/Owner/old` with the given repo, or the given failure
 * @param repo the API repo, or the failure text
 * @returns the fake runner
 */
function fakeGh(repo: Readonly<Record<string, unknown>> | string = apiRepo()) {
  return vi.fn<GhRunner>(() => Promise.resolve(typeof repo === 'string' ? { ok: false, stderr: repo, stdout: '' } : { ok: true, stderr: '', stdout: JSON.stringify(repo) }))
}

/**
 * A target with a clone folder in it, and fake git readers: the target lists the clone, a fresh read gives the fresh one
 * @param fresh what changed in the fresh clone, after the fetch
 * @param listed the clones the target lists, the clone by default
 * @returns the target, the clone folder and the options to delete it
 */
async function makeWorkspace(fresh: Readonly<Partial<LocalClone>> = {}, listed?: readonly Partial<LocalClone>[]) {
  const target = await mkdtemp(path.join(tmpdir(), 'repo-check-delete-'))
  onTestFinished(() => rm(target, { force: true, recursive: true }))
  const folder = path.join(target, 'old')
  await mkdir(folder)
  await writeFile(path.join(folder, 'file.txt'), 'x')
  const clones = (listed ?? [{}]).map(fields => aClone(folder, fields))
  const git = { readClone: vi.fn<GitReaders['readClone']>(() => Promise.resolve(aClone(folder, fresh))), readClones: vi.fn<GitReaders['readClones']>(() => Promise.resolve(clones)) }
  return { folder, git, target }
}

describe(deleteClone, () => {
  it('deletes the clone of an archived repo that holds nothing that is not on GitHub, after a fresh fetch', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace()
    await expect(deleteClone({ gh: fakeGh(), git, name: 'old', owner: 'Owner', target })).resolves.toStrictEqual({ message: `deleted the clone ${folder}`, ok: true })
    expect(git.readClone).toHaveBeenCalledWith(folder, { shouldFetch: true })
    await expect(exists(folder)).resolves.toBe(false)
  })

  it('refuses when the fresh fetch finds unpushed work the scan did not know', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace({ unpushed: [{ branch: 'master', subjects: ['one more'] }] })
    const result = await deleteClone({ gh: fakeGh(), git, name: 'old', owner: 'Owner', target })
    expect(result).toStrictEqual({ ok: false, reason: 'owner/old: archived on GitHub, but the clone holds work that exists nowhere else: 1 unpushed commit' })
    await expect(exists(folder)).resolves.toBe(true)
  })

  it.each([
    ['the fetch failed', { fetchFailed: true }, 'owner/old: archived on GitHub, but the fetch failed so the clone cannot be proved safe to delete'],
    ['the folder is not a usable clone', { problem: 'no-origin' as const }, 'owner/old: the clone does not qualify for delete-clone'],
  ])('refuses when %s', async (_name, fresh, reason) => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace(fresh)
    await expect(deleteClone({ gh: fakeGh(), git, name: 'old', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason })
    await expect(exists(folder)).resolves.toBe(true)
  })

  it.each([
    ['is gone from GitHub', 'gh: Not Found (HTTP 404)', 'Owner/old does not exist on GitHub any more'],
    ['was renamed', apiRepo({ name: 'old-2' }), 'Owner/old was renamed or moved to owner/old-2, scan again'],
    ['is not archived', apiRepo({ archived: false }), 'Owner/old is not archived, this only applies to the clone of an archived repo'],
    ['is a fork', apiRepo({ fork: true }), 'Owner/old is a fork, its delete is the fork delete'],
  ])('refuses a repo that %s, and reads no clone', async (_name, repo, reason) => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace()
    await expect(deleteClone({ gh: fakeGh(repo), git, name: 'old', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason })
    expect(git.readClones).not.toHaveBeenCalled()
    await expect(exists(folder)).resolves.toBe(true)
  })

  it.each([
    ['no clone of the repo', [{ slug: 'owner/other' }], (target: string) => `no clone of owner/old in ${target}`],
    ['two clones of the repo', [{}, { folderName: 'old-2' }], (target: string) => `2 clones of owner/old in ${target}, delete the extra ones by hand`],
  ])('refuses %s', async (_name, listed, reason) => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace({}, listed)
    await expect(deleteClone({ gh: fakeGh(), git, name: 'old', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: reason(target) })
    await expect(exists(folder)).resolves.toBe(true)
  })

  it.each(['../old', '.', '..', 'a/b', ''])('refuses the name "%s", it is not a repo name', async name => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    const gh = fakeGh()
    await expect(deleteClone({ gh, git, name, owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: `${name} is not a repo name` })
    expect(gh).not.toHaveBeenCalled()
  })

  it('refuses when the target is a single project', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    await mkdir(path.join(target, '.git'))
    await expect(deleteClone({ gh: fakeGh(), git, name: 'old', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: 'the target is a single project, actions work on a folder of projects' })
  })

  it('refuses a clone that is not a direct child of the folder of projects', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace()
    const nested = path.join(target, 'deep', 'old')
    git.readClone.mockResolvedValue(aClone(nested))
    const result = await deleteClone({ gh: fakeGh(), git, name: 'old', owner: 'Owner', target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('a clone is a direct child of the folder of projects') })
    await expect(exists(folder)).resolves.toBe(true)
  })

  it.each([['an Error', new Error('gh: To get started with GitHub CLI, please run: gh auth login'), 'gh api repos/Owner/old failed: gh: To get started with GitHub CLI, please run: gh auth login']])('reports a gh failure', async (_name, _error, reason) => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    await expect(deleteClone({ gh: fakeGh('gh: To get started with GitHub CLI, please run: gh auth login'), git, name: 'old', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason })
  })

  it('reports a failure that is not an Error', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    const gh = vi.fn<GhRunner>(() => Promise.reject(new Error('spawn gh ENOENT').message))
    await expect(deleteClone({ gh, git, name: 'old', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: 'spawn gh ENOENT' })
  })
})

describe(previewDeleteClone, () => {
  it('lists the ignored files the delete would lose', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace()
    await run('git', ['init', '--quiet'], folder)
    await writeFile(path.join(folder, '.gitignore'), '.env\n')
    await writeFile(path.join(folder, '.env'), 'SECRET=1')
    await expect(previewDeleteClone({ gh: fakeGh(), git, name: 'old', owner: 'Owner', target })).resolves.toStrictEqual({ ignoredFiles: ['.env'], ok: true, path: folder })
  })

  it('refuses with the reason of the proof, and deletes nothing', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace({ changedFiles: ['?? notes.txt'] })
    const result = await previewDeleteClone({ gh: fakeGh(), git, name: 'old', owner: 'Owner', target })
    expect(result).toStrictEqual({ ok: false, reason: 'owner/old: archived on GitHub, but the clone holds work that exists nowhere else: 1 changed file' })
    await expect(exists(folder)).resolves.toBe(true)
  })

  it('reports git failing to list the ignored files', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace()
    const result = await previewDeleteClone({ gh: fakeGh(), git, name: 'old', owner: 'Owner', target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining(`git ls-files failed in ${folder}`) })
  })

  it('reports a failure that is not an Error', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    const gh = vi.fn<GhRunner>(() => Promise.reject(new Error('spawn gh ENOENT').message))
    await expect(previewDeleteClone({ gh, git, name: 'old', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: 'spawn gh ENOENT' })
  })
})
