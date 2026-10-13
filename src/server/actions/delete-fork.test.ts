import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { LocalClone } from '../../shared/project.ts'
import type { GhRunner } from '../inventory/github.ts'
import { run } from '../inventory/shell.ts'
import type { GitReaders } from './action-options.ts'
import { deleteFork, previewDeleteFork } from './delete-fork.ts'
import { exists } from './guards.ts'

const repo = { archived: false, fork: true, name: 'lib', owner: { login: 'Owner' }, parent: { default_branch: 'main', full_name: 'them/lib' }, private: false, pushed_at: '2024-01-01T00:00:00Z' }
const scopes = 'HTTP/2.0 200 OK\nX-Oauth-Scopes: repo, delete_repo\n\n{"login":"Owner"}'

/** What the fake gh answers, each entry replaces the pristine default */
interface Answers {
  /** The branches ahead of the parent, by name */
  ahead?: Readonly<Record<string, number>>
  /** The outcome of the DELETE call */
  deleted?: { ok: boolean; stderr: string }
  /** Open pull requests per branch */
  pulls?: number
  /** The API repo, or undefined for a 404 */
  repo?: Readonly<Record<string, unknown>> | undefined
  /** The raw output of `gh api -i user` */
  scopes?: string
}

/**
 * A successful gh answer with a JSON body
 * @param value the body
 * @returns the answer
 */
function json(value: unknown) {
  return Promise.resolve({ ok: true, stderr: '', stdout: JSON.stringify(value) })
}

/**
 * A gh whose comparison of a branch with the parent fails, and that answers everything else like the given one
 * @param base the gh that answers the rest
 * @returns the fake runner
 */
function failingCompare(base: ReturnType<typeof fakeGh>) {
  return vi.fn<GhRunner>(args => (args.join(' ').includes('/compare/') ? Promise.resolve({ ok: false, stderr: 'gh: Not Found (HTTP 404)', stdout: '' }) : base(args)))
}

/**
 * A fake gh for a fork `Owner/lib` of `them/lib` with the branches main and patch-1: pristine unless told otherwise
 * @param answers what to change
 * @returns the fake runner
 */
function fakeGh(answers: Answers = {}) {
  const { ahead = {}, deleted = { ok: true, stderr: '' }, pulls = 0, scopes: scopeOutput = scopes } = answers
  const apiRepo = 'repo' in answers ? answers.repo : repo
  return vi.fn<GhRunner>(args => {
    const key = args.join(' ')
    if (key === 'api -i user') return Promise.resolve({ ok: true, stderr: '', stdout: scopeOutput })
    if (key === 'api --method DELETE repos/Owner/lib') return Promise.resolve({ ...deleted, stdout: '' })
    if (key === 'api repos/Owner/lib') return apiRepo === undefined ? Promise.resolve({ ok: false, stderr: 'gh: Not Found (HTTP 404)', stdout: '' }) : json(apiRepo)
    if (key === 'api --paginate --slurp repos/Owner/lib/branches?per_page=100') return json([[{ name: 'main' }, { name: 'patch-1' }]])
    if (key.includes('/compare/')) return json({ ahead_by: ahead[decodeURIComponent(key.split(':').at(-1) ?? '')] ?? 0 })
    if (key.includes('/pulls?')) return json(Array.from({ length: pulls }, (_item, index) => ({ number: index })))
    return Promise.resolve({ ok: false, stderr: `unexpected ${key}`, stdout: '' })
  })
}

/**
 * The DELETE calls a fake gh received
 * @param gh the fake gh
 * @returns the argument lists of the DELETE calls
 */
function deleteCalls(gh: ReturnType<typeof fakeGh>) {
  return gh.mock.calls.map(([args]) => args).filter(args => args.includes('DELETE'))
}

/**
 * A folder of projects, with a real clone folder of the fork in it unless told otherwise, and fake git readers
 * @param clone the fields of the fresh clone, `none` for a fork that is not cloned
 * @param listed the clones the folder lists, the clone by default
 * @returns the target, the clone folder and the readers
 */
async function makeWorkspace(clone: Readonly<Partial<LocalClone>> | 'none' = {}, listed?: readonly Partial<LocalClone>[]) {
  const target = await mkdtemp(path.join(tmpdir(), 'repo-check-fork-'))
  onTestFinished(() => rm(target, { force: true, recursive: true }))
  const folder = path.join(target, 'lib')
  await mkdir(folder)
  const read = (fields: Readonly<Partial<LocalClone>>): LocalClone => ({
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
    ...fields,
  })
  const fresh = clone === 'none' ? {} : clone
  const clones = clone === 'none' ? [] : (listed ?? [{}]).map(fields => read(fields))
  const git: GitReaders = { readClone: vi.fn<GitReaders['readClone']>(() => Promise.resolve(read(fresh))), readClones: vi.fn<GitReaders['readClones']>(() => Promise.resolve(clones)) }
  return { folder, git, target }
}

describe(deleteFork, () => {
  it('deletes a pristine fork that is not cloned, after comparing every branch again', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace('none')
    const gh = fakeGh()
    await expect(deleteFork({ gh, git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ message: 'deleted the fork Owner/lib on GitHub', ok: true })
    expect(deleteCalls(gh)).toStrictEqual([['api', '--method', 'DELETE', 'repos/Owner/lib']])
  })

  it('deletes the fork on GitHub, then its clean clone', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace()
    const gh = fakeGh()
    const result = await deleteFork({ gh, git, name: 'lib', owner: 'Owner', target })
    expect(result).toStrictEqual({ message: `deleted the fork Owner/lib on GitHub and its clone ${folder}`, ok: true })
    expect(git.readClone).toHaveBeenCalledWith(folder, { shouldFetch: true })
    await expect(exists(folder)).resolves.toBe(false)
  })

  it.each([
    ['a branch ahead of the parent', { ahead: { 'patch-1': 2 } }, 'Owner/lib: a fork of them/lib with work to keep: patch-1 is 2 ahead'],
    ['an open pull request', { pulls: 1 }, 'Owner/lib: a fork of them/lib with work to keep: 2 open pull requests'],
  ])('refuses a fork with %s, and deletes nothing', async (_name, answers, reason) => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace()
    const gh = fakeGh(answers)
    await expect(deleteFork({ gh, git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason })
    expect(deleteCalls(gh)).toStrictEqual([])
    await expect(exists(folder)).resolves.toBe(true)
  })

  it('refuses a fork it cannot verify, a failed comparison is never nothing to lose', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace('none')
    const gh = failingCompare(fakeGh())
    const result = await deleteFork({ gh, git, name: 'lib', owner: 'Owner', target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('a fork that cannot be verified, so it is never offered for deletion') })
  })

  it.each([
    ['unpushed commits', { unpushed: [{ branch: 'main', subjects: ['one'] }] }, 'local clone has 1 unpushed commit'],
    ['uncommitted files', { changedFiles: ['?? a'] }, 'local clone has 1 changed file'],
    ['a failed fetch', { fetchFailed: true }, 'the local clone could not be fetched'],
  ])('refuses a fork whose clone has %s, and deletes nothing', async (_name, fresh, reason) => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace(fresh)
    const gh = fakeGh()
    await expect(deleteFork({ gh, git, name: 'lib', owner: 'Owner', target })).resolves.toMatchObject({ ok: false, reason: expect.stringContaining(reason) })
    expect(deleteCalls(gh)).toStrictEqual([])
    await expect(exists(folder)).resolves.toBe(true)
  })

  it.each([
    ['is gone from GitHub', { repo: undefined }, 'Owner/lib does not exist on GitHub any more'],
    ['was renamed', { repo: { ...repo, name: 'lib-2' } }, 'Owner/lib was renamed or moved to owner/lib-2, scan again'],
    ['is not a fork', { repo: { ...repo, fork: false } }, 'Owner/lib is not a fork, this only applies to a fork'],
  ])('refuses a repo that %s', async (_name, answers, reason) => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    const gh = fakeGh(answers)
    await expect(deleteFork({ gh, git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason })
    expect(deleteCalls(gh)).toStrictEqual([])
  })

  it('refuses two clones of the fork', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace({}, [{}, { folderName: 'lib-2' }])
    await expect(deleteFork({ gh: fakeGh(), git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: `2 clones of owner/lib in ${target}, delete the extra ones by hand` })
  })

  it.each(['../lib', '.', '..', 'a/b', ''])('refuses the name "%s", it is not a repo name', async name => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    await expect(deleteFork({ gh: fakeGh(), git, name, owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: `${name} is not a repo name` })
  })

  it('refuses when the target is a single project', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    await mkdir(path.join(target, '.git'))
    await expect(deleteFork({ gh: fakeGh(), git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: 'the target is a single project, actions work on a folder of projects' })
  })

  it('refuses without the delete_repo scope, and says how to add it', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace('none')
    const gh = fakeGh({ scopes: 'HTTP/2.0 200 OK\nX-Oauth-Scopes: repo\n\n{}' })
    await expect(deleteFork({ gh, git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: 'the gh token has no delete_repo scope, run: gh auth refresh -s delete_repo' })
    expect(deleteCalls(gh)).toStrictEqual([])
  })

  it.each([
    ['a 403', { ok: false, stderr: 'gh: Must have admin rights to Repository. (HTTP 403)' }, 'GitHub refused to delete Owner/lib: gh: Must have admin rights to Repository. (HTTP 403). If the token has no delete_repo scope, run: gh auth refresh -s delete_repo'],
    ['another failure', { ok: false, stderr: 'gh: Server Error (HTTP 500)' }, 'GitHub refused to delete Owner/lib: gh: Server Error (HTTP 500)'],
  ])('keeps the clone and gives the reason when GitHub answers %s', async (_name, deleted, reason) => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace()
    await expect(deleteFork({ gh: fakeGh({ deleted }), git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason })
    await expect(exists(folder)).resolves.toBe(true)
  })

  it('refuses to remove a clone that is not a direct child of the folder of projects, after the fork is gone', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    vi.spyOn(git, 'readClone').mockResolvedValue({
      branches: [],
      changedFiles: [],
      currentBranch: 'main',
      fetchFailed: false,
      folderName: 'lib',
      localOnlyBranches: [],
      origin: 'git@github.com:Owner/lib.git',
      path: path.join(target, 'deep', 'lib'),
      problem: undefined,
      slug: 'owner/lib',
      stashes: [],
      unpushed: [],
    })
    const result = await deleteFork({ gh: fakeGh(), git, name: 'lib', owner: 'Owner', target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('a clone is a direct child of the folder of projects') })
  })

  it.each([
    ['an Error', () => Promise.reject(new Error('network down')), 'network down'],
    ['a string', () => Promise.reject(new Error('spawn gh ENOENT').message), 'spawn gh ENOENT'],
  ])('reports %s thrown while asking GitHub', async (_name, fail, reason) => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    await expect(deleteFork({ gh: vi.fn<GhRunner>(fail), git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason })
  })
})

describe(previewDeleteFork, () => {
  it('says what is compared, and that nothing else is deleted for a fork that is not cloned', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace('none')
    await expect(previewDeleteFork({ gh: fakeGh(), git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ branches: 2, clone: undefined, ok: true, parent: 'them/lib' })
  })

  it('lists the ignored files of the clone that is deleted with the fork', async () => {
    expect.hasAssertions()
    const { folder, git, target } = await makeWorkspace()
    await run('git', ['init', '--quiet'], folder)
    await writeFile(path.join(folder, '.gitignore'), '.env\n')
    await writeFile(path.join(folder, '.env'), 'SECRET=1')
    await expect(previewDeleteFork({ gh: fakeGh(), git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ branches: 2, clone: { ignoredFiles: ['.env'], path: folder }, ok: true, parent: 'them/lib' })
  })

  it('refuses with the reason of the proof', async () => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace('none')
    await expect(previewDeleteFork({ gh: fakeGh({ ahead: { main: 1 } }), git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: 'Owner/lib: a fork of them/lib with work to keep: main is 1 ahead' })
  })

  it.each([
    ['an Error', () => Promise.reject(new Error('network down')), 'network down'],
    ['a string', () => Promise.reject(new Error('spawn gh ENOENT').message), 'spawn gh ENOENT'],
  ])('reports %s thrown while asking GitHub', async (_name, fail, reason) => {
    expect.hasAssertions()
    const { git, target } = await makeWorkspace()
    await expect(previewDeleteFork({ gh: vi.fn<GhRunner>(fail), git, name: 'lib', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason })
  })
})
