import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { LocalClone } from '../../shared/project.ts'
import type { GhRunner } from '../inventory/github.ts'
import { run } from '../inventory/shell.ts'
import type { GitReaders } from './action-options.ts'
import { deleteProject, previewDeleteProject } from './delete-project.ts'
import { exists } from './guards.ts'

const repo = { archived: false, fork: false, name: 'lib', owner: { login: 'Owner' }, private: false, pushed_at: '2024-01-01T00:00:00Z' }
const scopes = 'HTTP/2.0 200 OK\nX-Oauth-Scopes: repo, delete_repo\n\n{"login":"Owner"}'

/**
 * A fake gh for the repo `Owner/lib`
 * @param answers what to change: the repo (undefined for a 404), the outcome of the DELETE
 * @param answers.deleted the outcome of the DELETE call
 * @param answers.hasRepo false for a repo that is not on GitHub
 * @returns the fake runner
 */
function fakeGh({ deleted = { ok: true, stderr: '' }, hasRepo = true }: { deleted?: { ok: boolean; stderr: string }; hasRepo?: boolean } = {}) {
  return vi.fn<GhRunner>(args => {
    const key = args.join(' ')
    if (key === 'api -i user') return Promise.resolve({ ok: true, stderr: '', stdout: scopes })
    if (key === 'api --method DELETE repos/Owner/lib') return Promise.resolve({ ...deleted, stdout: '' })
    if (key === 'api repos/Owner/lib') return Promise.resolve(hasRepo ? { ok: true, stderr: '', stdout: JSON.stringify(repo) } : { ok: false, stderr: 'gh: Not Found (HTTP 404)', stdout: '' })
    return Promise.resolve({ ok: false, stderr: `unexpected ${key}`, stdout: '' })
  })
}

/**
 * A folder of projects with a real clone folder in it, and fake git readers
 * @param fields the fields of the clone, `none` for a project that is not cloned
 * @returns the target, the clone folder and the readers
 */
async function makeWorkspace(fields: Readonly<Partial<LocalClone>> | 'none' = {}) {
  const target = await mkdtemp(path.join(tmpdir(), 'repo-check-project-'))
  onTestFinished(() => rm(target, { force: true, recursive: true }))
  const folder = path.join(target, 'lib')
  await mkdir(folder)
  await run('git', ['init', folder])
  const clone: LocalClone = {
    branches: [],
    changedFiles: [],
    currentBranch: 'main',
    fetchFailed: false,
    folderName: 'lib',
    localOnlyBranches: [],
    origin: 'git@github.com:Owner/lib.git',
    path: folder,
    problem: undefined,
    slug: 'owner/lib',
    stashes: [],
    unpushed: [],
    ...(fields === 'none' ? {} : fields),
  }
  const git: GitReaders = { readClone: vi.fn<GitReaders['readClone']>(() => Promise.resolve(clone)), readClones: vi.fn<GitReaders['readClones']>(() => Promise.resolve(fields === 'none' ? [] : [clone])) }
  return { folder, git, target }
}

describe(previewDeleteProject, () => {
  it('lists the unsaved work that would be lost with the clone', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace({ changedFiles: ['?? a.txt'], localOnlyBranches: ['wip'], stashes: ['stash@{0}: x'], unpushed: [{ branch: 'main', subjects: ['one', 'two'] }] })
    const preview = await previewDeleteProject({ gh: fakeGh(), git, name: 'lib', owner: 'Owner', target })
    expect(preview).toStrictEqual({ clone: { ignoredFiles: [], path: folder, unsaved: ['2 unpushed commits', '1 uncommitted or untracked file', '1 stash entry', '1 local-only branch (wip)'] }, ok: true, repo: 'owner/lib' })
  })

  it('refuses when there is nothing to delete', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace('none')
    await expect(previewDeleteProject({ gh: fakeGh({ hasRepo: false }), git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: `Owner/lib is neither on GitHub nor in ${target}, nothing to delete` })
  })

  it('refuses a name that is a path', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    await expect(previewDeleteProject({ gh: fakeGh(), git, name: '../x', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: '../x is not a repo name' })
  })
})

describe('refusals of both', () => {
  const noScope = 'HTTP/2.0 200 OK\nX-Oauth-Scopes: repo\n\n{}'
  const answers: Record<string, string> = { 'api -i user': noScope }
  const fakeGhWithoutScope = () => vi.fn<GhRunner>(args => Promise.resolve({ ok: true, stderr: '', stdout: answers[args.join(' ')] ?? JSON.stringify(repo) }))

  it.each([previewDeleteProject, deleteProject])('refuses a folder of projects that is a single project', async action => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    await mkdir(path.join(target, '.git'))
    await expect(action({ gh: fakeGh(), git, name: 'lib', owner: 'Owner', target })).resolves.toMatchObject({ ok: false })
  })

  it.each([previewDeleteProject, deleteProject])('refuses a repo that was renamed', async action => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    const gh = vi.fn<GhRunner>(() => Promise.resolve({ ok: true, stderr: '', stdout: JSON.stringify({ ...repo, name: 'other' }) }))
    await expect(action({ gh, git, name: 'lib', owner: 'Owner', target })).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('was renamed or moved') as string })
  })

  it.each([previewDeleteProject, deleteProject])('refuses two clones of the same repo', async action => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    const [clone] = await git.readClones(target, { shouldFetch: false })
    git.readClones = () => Promise.resolve([clone, clone] as LocalClone[])
    await expect(action({ gh: fakeGh(), git, name: 'lib', owner: 'Owner', target })).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('2 clones') as string })
  })

  it('finds a clone by its folder name when the repo is gone from GitHub', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace({ slug: 'other/else' })
    const preview = await previewDeleteProject({ gh: fakeGh({ hasRepo: false }), git, name: 'lib', owner: 'Owner', target })
    expect(preview).toMatchObject({ clone: { path: folder }, ok: true, repo: undefined })
  })

  it('refuses a preview when the token has no delete scope', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    const gh = fakeGhWithoutScope()
    await expect(previewDeleteProject({ gh, git, name: 'lib', owner: 'Owner', target })).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('no delete_repo scope') as string })
  })

  it('refuses a delete when the token has no delete scope, and keeps the clone', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace()
    const gh = fakeGhWithoutScope()
    await expect(deleteProject({ gh, git, name: 'lib', owner: 'Owner', target })).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('no delete_repo scope') as string })
    await expect(exists(folder)).resolves.toBe(true)
  })

  it.each([previewDeleteProject, deleteProject])('gives the reason when something throws, an error or not', async action => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    const options = { git, name: 'lib', owner: 'Owner', target }
    await expect(action({ ...options, gh: () => Promise.reject(new Error('boom')) })).resolves.toStrictEqual({ ok: false, reason: 'boom' })
    await expect(action({ ...options, gh: () => Promise.reject(new Error('plain', { cause: 'x' }).cause) })).resolves.toStrictEqual({ ok: false, reason: 'x' })
  })
})

describe(deleteProject, () => {
  it('deletes the repo on GitHub, then the clone, even with unsaved work', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace({ stashes: ['stash@{0}: x'] })
    const gh = fakeGh()
    const result = await deleteProject({ gh, git, name: 'lib', owner: 'Owner', target })
    expect(result).toStrictEqual({ message: `deleted the repo owner/lib on GitHub and the clone ${folder}`, ok: true })
    await expect(exists(folder)).resolves.toBe(false)
  })

  it('deletes a clone that has no repo on GitHub, without calling DELETE', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace()
    const gh = fakeGh({ hasRepo: false })
    await expect(deleteProject({ gh, git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ message: `deleted the clone ${folder}`, ok: true })
    expect(gh.mock.calls.some(([args]) => args.includes('DELETE'))).toBe(false)
  })

  it('deletes a repo that is not cloned', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace('none')
    await expect(deleteProject({ gh: fakeGh(), git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ message: 'deleted the repo owner/lib on GitHub', ok: true })
  })

  it('gives the GitHub own reason when the refusal is not about the scope', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    const gh = fakeGh({ deleted: { ok: false, stderr: 'HTTP 500' } })
    await expect(deleteProject({ gh, git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: 'GitHub refused to delete owner/lib: HTTP 500' })
  })

  it('keeps the clone when GitHub refuses, and gives the command for a missing scope', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace()
    const gh = fakeGh({ deleted: { ok: false, stderr: 'HTTP 403' } })
    const result = await deleteProject({ gh, git, name: 'lib', owner: 'Owner', target })
    expect(result).toStrictEqual({ ok: false, reason: 'GitHub refused to delete owner/lib: HTTP 403. If the token has no delete_repo scope, run: gh auth refresh -s delete_repo' })
    await expect(exists(folder)).resolves.toBe(true)
  })
})
