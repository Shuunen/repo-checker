import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { LocalClone } from '../../../shared/project.ts'
import type { GhRunner } from '../../inventory/github.ts'
import { run } from '../../inventory/shell.ts'
import type { GitReaders } from '../action-options.ts'
import { exists } from '../guards.ts'
import { deleteProject, previewDeleteProject } from './delete-project.ts'

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
    if (key.toLowerCase() === 'api --method delete repos/owner/lib') return Promise.resolve({ ...deleted, stdout: '' })
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
  const git: GitReaders = { listClones: vi.fn<GitReaders['listClones']>(() => Promise.resolve(fields === 'none' ? [] : [clone])), readClone: vi.fn<GitReaders['readClone']>(() => Promise.resolve(clone)) }
  return { clone, folder, git, target }
}

/**
 * The fingerprint the dialog would send back, read with a gh that has the delete scope
 * @param git the git readers
 * @param target the folder of projects
 * @param hasRepo false for a repo that is not on GitHub
 * @returns the fingerprint of the preview
 */
async function shownFingerprint(git: GitReaders, target: string, hasRepo = true) {
  const preview = await previewDeleteProject({ gh: fakeGh({ hasRepo }), git, name: 'lib', owner: 'Owner', target })
  return preview.ok ? preview.fingerprint : ''
}

describe(previewDeleteProject, () => {
  it('lists the unsaved work that would be lost with the clone', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace({ changedFiles: ['?? a.txt'], localOnlyBranches: ['wip'], stashes: ['stash@{0}: x'], unpushed: [{ branch: 'main', subjects: ['one', 'two'] }] })
    const preview = await previewDeleteProject({ gh: fakeGh(), git, name: 'lib', owner: 'Owner', target })
    expect(preview).toStrictEqual({ clone: { ignoredFiles: [], path: folder, unsaved: ['2 unpushed commits', '1 uncommitted or untracked file', '1 stash entry', '1 local-only branch (wip)'] }, fingerprint: expect.any(String) as string, ok: true, repo: 'owner/lib' })
  })

  // Value: protects=a folder the scan cannot compare (no origin, no git, unreadable) is never shown as holding nothing; fails_when=lostWith skips the problem clones again; why_new=only usable clones were listed; seam=none; no_claim=real git
  it.each([
    ['no-origin', 'its whole git history, the repo has no origin remote'],
    ['no-git', 'every file in it, the folder is not a git repo'],
    ['unreadable', 'what it holds is unknown, git cannot read its state'],
  ] as const)('says a %s folder loses everything it holds', async (problem, loss) => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace({ origin: undefined, problem, slug: undefined })
    const preview = await previewDeleteProject({ gh: fakeGh({ hasRepo: false }), git, name: 'lib', owner: 'Owner', target })
    expect(preview).toMatchObject({ clone: { unsaved: [loss] }, ok: true })
  })

  it('refuses when there is nothing to delete', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace('none')
    await expect(previewDeleteProject({ gh: fakeGh({ hasRepo: false }), git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: `Owner/lib is neither on GitHub nor in ${target}, nothing to delete` })
  })
})

/**
 * Run a delete with the fingerprint of a preview that was never shown, the refusals come before the fingerprint
 * @param options what to delete
 * @returns the result
 */
const deleteUnseen = (options: Parameters<typeof previewDeleteProject>[0]) => deleteProject({ ...options, fingerprint: '' })

describe('refusals of both', () => {
  const noScope = 'HTTP/2.0 200 OK\nX-Oauth-Scopes: repo\n\n{}'
  const answers: Record<string, string> = { 'api -i user': noScope }
  const fakeGhWithoutScope = () => vi.fn<GhRunner>(args => Promise.resolve({ ok: true, stderr: '', stdout: answers[args.join(' ')] ?? JSON.stringify(repo) }))

  it.each([previewDeleteProject, deleteUnseen])('refuses a folder of projects that is a single project', async action => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    await mkdir(path.join(target, '.git'))
    await expect(action({ gh: fakeGh(), git, name: 'lib', owner: 'Owner', target })).resolves.toMatchObject({ ok: false })
  })

  it.each([previewDeleteProject, deleteUnseen])('refuses a repo that was renamed', async action => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    const gh = vi.fn<GhRunner>(() => Promise.resolve({ ok: true, stderr: '', stdout: JSON.stringify({ ...repo, name: 'other' }) }))
    await expect(action({ gh, git, name: 'lib', owner: 'Owner', target })).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('was renamed or moved') as string })
  })

  it.each([previewDeleteProject, deleteUnseen])('refuses two clones of the same repo', async action => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    const [clone] = await git.listClones(target)
    git.listClones = () => Promise.resolve([clone, clone] as LocalClone[])
    await expect(action({ gh: fakeGh(), git, name: 'lib', owner: 'Owner', target })).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('2 clones') as string })
  })

  it('finds a folder by its name when the repo is not on GitHub and the folder has no GitHub origin', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace({ origin: undefined, problem: 'no-origin', slug: undefined })
    const preview = await previewDeleteProject({ gh: fakeGh({ hasRepo: false }), git, name: 'lib', owner: 'Owner', target })
    expect(preview).toMatchObject({ clone: { path: folder }, ok: true, repo: undefined })
  })

  // Value: protects=a clone of someone else's repo is never picked by its folder name; fails_when=the name fallback ignores the slug again; why_new=the old test asserted the bug; seam=none; no_claim=none beyond protects
  it.each([previewDeleteProject, deleteUnseen])('never picks a clone of another repo by its folder name', async action => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace({ slug: 'alice/lib' })
    await expect(action({ gh: fakeGh({ hasRepo: false }), git, name: 'lib', owner: 'Owner', target })).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('neither on GitHub nor') as string })
    await expect(exists(folder)).resolves.toBe(true)
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
    const fingerprint = await shownFingerprint(git, target)
    await expect(deleteProject({ fingerprint, gh, git, name: 'lib', owner: 'Owner', target })).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('no delete_repo scope') as string })
    await expect(exists(folder)).resolves.toBe(true)
  })

  it.each([previewDeleteProject, deleteUnseen])('gives the reason when something throws, an error or not', async action => {
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
    const result = await deleteProject({ fingerprint: await shownFingerprint(git, target), gh, git, name: 'lib', owner: 'Owner', target })
    expect(result).toStrictEqual({ message: `deleted the repo owner/lib on GitHub and the clone ${folder}`, ok: true })
    await expect(exists(folder)).resolves.toBe(false)
  })

  it('deletes a clone that has no repo on GitHub, without calling DELETE', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace()
    const gh = fakeGh({ hasRepo: false })
    await expect(deleteProject({ fingerprint: await shownFingerprint(git, target, false), gh, git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ message: `deleted the clone ${folder}`, ok: true })
    expect(gh.mock.calls.some(([args]) => args.includes('DELETE'))).toBe(false)
  })

  it('deletes a repo that is not cloned', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace('none')
    await expect(deleteProject({ fingerprint: await shownFingerprint(git, target), gh: fakeGh(), git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ message: 'deleted the repo owner/lib on GitHub', ok: true })
  })

  it('gives the GitHub own reason when the refusal is not about the scope', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    const gh = fakeGh({ deleted: { ok: false, stderr: 'HTTP 500' } })
    await expect(deleteProject({ fingerprint: await shownFingerprint(git, target), gh, git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: 'GitHub refused to delete owner/lib: HTTP 500' })
  })

  // Value: protects=work added to the clone after the preview is never deleted unseen; fails_when=deleteProject stops checking the fingerprint; why_new=delete-project had no fingerprint; seam=none; no_claim=real git
  it('refuses when the clone holds something the dialog did not list, calls no DELETE and keeps the clone', async () => {
    expect.hasAssertions()
    const { clone, folder, git, target } = await makeWorkspace()
    const fingerprint = await shownFingerprint(git, target)
    vi.mocked(git.readClone).mockResolvedValue({ ...clone, stashes: ['stash@{0}: new work'] })
    const gh = fakeGh()
    await expect(deleteProject({ fingerprint, gh, git, name: 'lib', owner: 'Owner', target })).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('not what the dialog listed') as string })
    expect(gh.mock.calls.some(([args]) => args.includes('DELETE'))).toBe(false)
    await expect(exists(folder)).resolves.toBe(true)
  })

  // Value: protects=a clone that is not a direct child of the folder of projects stops the delete before GitHub is touched; fails_when=the path check moves after the DELETE; why_new=the repo was deleted before the check; seam=none; no_claim=symlinks
  it.each([true, false])('refuses a clone that is not a direct child of the folder of projects before any DELETE (repo on GitHub: %s)', async hasRepo => {
    expect.hasAssertions()
    const { clone, git, target } = await makeWorkspace()
    const nested = path.join(target, 'deep', 'lib')
    await mkdir(nested, { recursive: true })
    vi.mocked(git.readClone).mockResolvedValue({ ...clone, path: nested })
    const gh = fakeGh({ hasRepo })
    const result = await deleteProject({ fingerprint: '', gh, git, name: 'lib', owner: 'Owner', target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining(`is not directly in ${target}`) as string })
    expect(gh.mock.calls.some(([args]) => args.includes('DELETE'))).toBe(false)
    await expect(exists(nested)).resolves.toBe(true)
  })

  // Value: protects=a refused delete-project (renamed repo, two clones) calls no DELETE on GitHub and keeps the clone; fails_when=findProject refusals move after deleteRepo; why_new=the refusal tests only check ok:false; seam=none; no_claim=preview
  it.each([
    ['the repo was renamed', () => vi.fn<GhRunner>(() => Promise.resolve({ ok: true, stderr: '', stdout: JSON.stringify({ ...repo, name: 'other' }) })), 1],
    ['there are two clones', () => fakeGh(), 2],
  ])('calls no DELETE and keeps the clone when %s', async (_name, makeGh, copies) => {
    expect.hasAssertions()
    const { clone, folder, git, target } = await makeWorkspace()
    git.listClones = () => Promise.resolve(Array.from({ length: copies }, () => clone))
    const gh = makeGh()
    await expect(deleteUnseen({ gh, git, name: 'lib', owner: 'Owner', target })).resolves.toMatchObject({ ok: false })
    expect(gh.mock.calls.some(([args]) => args.includes('DELETE'))).toBe(false)
    await expect(exists(folder)).resolves.toBe(true)
  })

  it('keeps the clone when GitHub refuses, and gives the command for a missing scope', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace()
    const gh = fakeGh({ deleted: { ok: false, stderr: 'HTTP 403' } })
    const result = await deleteProject({ fingerprint: await shownFingerprint(git, target), gh, git, name: 'lib', owner: 'Owner', target })
    expect(result).toStrictEqual({ ok: false, reason: 'GitHub refused to delete owner/lib: HTTP 403. If the token has no delete_repo scope, run: gh auth refresh -s delete_repo' })
    await expect(exists(folder)).resolves.toBe(true)
  })
})
