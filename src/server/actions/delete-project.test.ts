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

  it('keeps the clone when GitHub refuses, and gives the command for a missing scope', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace()
    const gh = fakeGh({ deleted: { ok: false, stderr: 'HTTP 403' } })
    const result = await deleteProject({ gh, git, name: 'lib', owner: 'Owner', target })
    expect(result).toStrictEqual({ ok: false, reason: 'GitHub refused to delete owner/lib: HTTP 403. If the token has no delete_repo scope, run: gh auth refresh -s delete_repo' })
    await expect(exists(folder)).resolves.toBe(true)
  })
})
