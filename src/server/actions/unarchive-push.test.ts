import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { LocalClone } from '../../shared/project.ts'
import type { GhRunner } from '../inventory/github.ts'
import { run } from '../inventory/shell.ts'
import type { GitReaders } from './action-options.ts'
import { unarchivePush } from './unarchive-push.ts'

const identity = ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false']
const apiRepo = { archived: true, fork: false, name: 'old', owner: { login: 'Owner' }, private: false, pushed_at: '2025-01-01T00:00:00Z' }

/**
 * Run git in a folder, failing the test when git fails
 * @param folder the folder
 * @param args the git arguments
 * @returns the output
 */
async function git(folder: string, ...args: readonly string[]) {
  const result = await run('git', [...identity, ...args], folder)
  if (!result.ok) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`)
  return result.stdout.trim()
}

/** A workspace: a bare origin, a clone with an unpushed commit on master and a local-only branch wip, and the fake git readers */
interface Workspace {
  /** The bare origin */
  bare: string
  /** The clone */
  folder: string
  /** The fake git readers */
  readers: GitReaders
  /** The folder of projects */
  target: string
}

/**
 * Create a real clone with work to save, and fake git readers that read it as the scan would
 * @param fresh what changed in the fresh read of the clone
 * @returns the workspace
 */
async function makeWorkspace(fresh: Readonly<Partial<LocalClone>> = {}): Promise<Workspace> {
  const target = await mkdtemp(path.join(tmpdir(), 'repo-check-unarchive-'))
  onTestFinished(() => rm(target, { force: true, recursive: true }))
  const bare = path.join(target, 'origin.git')
  const folder = path.join(target, 'old')
  await mkdir(bare)
  await git(bare, 'init', '--quiet', '--bare', '--initial-branch=master')
  await mkdir(folder)
  await git(folder, 'init', '--quiet', '--initial-branch=master')
  await git(folder, 'remote', 'add', 'origin', bare)
  await git(folder, 'commit', '--quiet', '--allow-empty', '-m', 'init')
  await git(folder, 'push', '--quiet', 'origin', 'master')
  await writeFile(path.join(folder, 'a.txt'), 'a')
  await git(folder, 'add', '.')
  await git(folder, 'commit', '--quiet', '-m', 'unpushed work')
  await git(folder, 'branch', 'wip')
  const clone: LocalClone = {
    branches: [],
    changedFiles: [],
    currentBranch: 'master',
    fetchFailed: false,
    folderName: 'old',
    localOnlyBranches: ['wip'],
    origin: 'git@github.com:Owner/old.git',
    path: folder,
    problem: undefined,
    slug: 'owner/old',
    stashes: [],
    unpushed: [{ branch: 'master', subjects: ['unpushed work'] }],
    ...fresh,
  }
  const readers = { listClones: vi.fn<GitReaders['listClones']>(() => Promise.resolve([clone])), readClone: vi.fn<GitReaders['readClone']>(() => Promise.resolve(clone)) }
  return { bare, folder, readers, target }
}

/** What goes wrong with the fake GitHub after the PATCH calls */
interface Behavior {
  /** True when the repo cannot be read back after the proof read it */
  cannotReadBack: boolean
  /** True when the PATCH that archives again says ok but changes nothing */
  isStuck: boolean
}

/** Nothing goes wrong */
const nothingWrong: Behavior = { cannotReadBack: false, isStuck: false }

/**
 * A fake gh that answers the repo, which a PATCH really archives or unarchives, recording what was called
 * @param patch whether each PATCH works, in order: unarchive then archive again
 * @param repo the API repo
 * @param behavior what goes wrong after the PATCH calls, nothing by default
 * @returns the fake runner
 */
function fakeGh(patch: readonly [boolean, boolean] = [true, true], repo: Readonly<Record<string, unknown>> = apiRepo, behavior: Readonly<Behavior> = nothingWrong) {
  let isArchived = repo.archived
  let reads = 0
  return vi.fn<GhRunner>(args => {
    if (!args.includes('PATCH')) {
      reads += 1
      return Promise.resolve(behavior.cannotReadBack && reads > 1 ? { ok: false, stderr: 'gh: Bad gateway (HTTP 502)', stdout: '' } : { ok: true, stderr: '', stdout: JSON.stringify({ ...repo, archived: isArchived }) })
    }
    const ok = patch[args.includes('archived=false') ? 0 : 1]
    if (ok && !(behavior.isStuck && args.includes('archived=true'))) isArchived = args.includes('archived=true')
    return Promise.resolve({ ok, stderr: ok ? '' : 'HTTP 403: Must have admin rights', stdout: '{}' })
  })
}

/**
 * The PATCH calls of a fake gh, as the archived value each one set
 * @param gh the fake gh
 * @returns like `['archived=false', 'archived=true']`
 */
function patched(gh: ReturnType<typeof fakeGh>) {
  return gh.mock.calls
    .map(([args]) => args)
    .filter(args => args.includes('PATCH'))
    .map(args => args.at(-1))
}

describe(unarchivePush, () => {
  it('unarchives, pushes every branch with unpushed commits and every local-only branch, and archives again', async () => {
    expect.hasAssertions()
    const { bare, readers, target } = await makeWorkspace()
    const gh = fakeGh()
    const result = await unarchivePush({ gh, git: readers, name: 'old', owner: 'Owner', target })
    expect(result).toStrictEqual({ message: 'pushed 2 branches (master, wip) to Owner/old, which is archived again', ok: true })
    expect(patched(gh)).toStrictEqual(['archived=false', 'archived=true'])
    await expect(git(bare, 'branch', '--list')).resolves.toContain('wip')
    await expect(git(bare, 'log', '--format=%s', 'master')).resolves.toContain('unpushed work')
  })

  it('archives again and says so when the push fails', async () => {
    expect.hasAssertions()
    const { bare, folder, readers, target } = await makeWorkspace()
    await git(folder, 'remote', 'set-url', 'origin', path.join(target, 'missing.git'))
    const gh = fakeGh()
    const result = await unarchivePush({ gh, git: readers, name: 'old', owner: 'Owner', target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('git push failed:') })
    expect(result).toMatchObject({ reason: expect.stringContaining('Owner/old is archived again, nothing was pushed') })
    expect(patched(gh)).toStrictEqual(['archived=false', 'archived=true'])
    await expect(git(bare, 'branch', '--list')).resolves.not.toContain('wip')
  })

  it('pushes nothing when the repo cannot be unarchived', async () => {
    expect.hasAssertions()
    const { bare, readers, target } = await makeWorkspace()
    const gh = fakeGh([false, true])
    const result = await unarchivePush({ gh, git: readers, name: 'old', owner: 'Owner', target })
    expect(result).toStrictEqual({ ok: false, reason: 'could not unarchive Owner/old, nothing was pushed: HTTP 403: Must have admin rights' })
    expect(patched(gh)).toStrictEqual(['archived=false'])
    await expect(git(bare, 'branch', '--list')).resolves.not.toContain('wip')
  })

  it('gives the hand command when archiving again fails after the push worked', async () => {
    expect.hasAssertions()
    const { readers, target } = await makeWorkspace()
    const result = await unarchivePush({ gh: fakeGh([true, false]), git: readers, name: 'old', owner: 'Owner', target })
    expect(result).toStrictEqual({ ok: false, reason: 'pushed 2 branches (master, wip), but Owner/old could not be archived again (HTTP 403: Must have admin rights), archive it by hand: gh api --method PATCH repos/Owner/old -F archived=true' })
  })

  it.each([
    ['says ok but changes nothing', { cannotReadBack: false, isStuck: true }],
    ['cannot be read back', { cannotReadBack: true, isStuck: false }],
  ])('gives the hand command when archiving again %s', async (_name, behavior) => {
    expect.hasAssertions()
    const { readers, target } = await makeWorkspace()
    const result = await unarchivePush({ gh: fakeGh([true, true], apiRepo, behavior), git: readers, name: 'old', owner: 'Owner', target })
    expect(result).toStrictEqual({ ok: false, reason: 'pushed 2 branches (master, wip), but Owner/old could not be archived again (GitHub still shows it as not archived), archive it by hand: gh api --method PATCH repos/Owner/old -F archived=true' })
  })

  it('gives the hand command and the push failure when both fail', async () => {
    expect.hasAssertions()
    const { folder, readers, target } = await makeWorkspace()
    await git(folder, 'remote', 'set-url', 'origin', path.join(target, 'missing.git'))
    const result = await unarchivePush({ gh: fakeGh([true, false]), git: readers, name: 'old', owner: 'Owner', target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('git push failed:') })
    expect(result).toMatchObject({ reason: expect.stringContaining('but Owner/old could not be archived again') })
  })

  it.each([
    ['uncommitted files', { changedFiles: ['?? notes.txt', ' M a.ts'] }, 'the clone has 2 uncommitted files, this action only pushes and never creates a commit: commit or discard them by hand first'],
    ['a stash', { stashes: ['stash@{0}: WIP'] }, 'the clone has 1 stash, this action only pushes: apply or drop them by hand first'],
  ])('refuses while the clone has %s, before unarchiving anything', async (_name, fresh, reason) => {
    expect.hasAssertions()
    const { readers, target } = await makeWorkspace(fresh)
    const gh = fakeGh()
    await expect(unarchivePush({ gh, git: readers, name: 'old', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason })
    expect(patched(gh)).toStrictEqual([])
  })

  it('refuses a clone that holds nothing unsaved, no rule offers the action', async () => {
    expect.hasAssertions()
    const { readers, target } = await makeWorkspace({ localOnlyBranches: [], unpushed: [] })
    const gh = fakeGh()
    await expect(unarchivePush({ gh, git: readers, name: 'old', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: 'owner/old: archived on GitHub, and the clone holds nothing that is not on GitHub' })
    expect(patched(gh)).toStrictEqual([])
  })

  it('refuses when the fetch failed, nothing is offered until it works', async () => {
    expect.hasAssertions()
    const { readers, target } = await makeWorkspace({ fetchFailed: true })
    const result = await unarchivePush({ gh: fakeGh(), git: readers, name: 'old', owner: 'Owner', target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('The fetch failed, nothing is offered until it works') })
  })

  it('refuses a repo that is not archived', async () => {
    expect.hasAssertions()
    const { readers, target } = await makeWorkspace()
    const gh = fakeGh([true, true], { ...apiRepo, archived: false })
    await expect(unarchivePush({ gh, git: readers, name: 'old', owner: 'Owner', target })).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('is not archived') })
    expect(patched(gh)).toStrictEqual([])
  })

  it('reports an Error thrown while asking GitHub', async () => {
    expect.hasAssertions()
    const { readers, target } = await makeWorkspace()
    const gh = vi.fn<GhRunner>(() => Promise.reject(new Error('network down')))
    await expect(unarchivePush({ gh, git: readers, name: 'old', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: 'network down' })
  })

  it('reports a failure that is not an Error', async () => {
    expect.hasAssertions()
    const { readers, target } = await makeWorkspace()
    const gh = vi.fn<GhRunner>(() => Promise.reject(new Error('spawn gh ENOENT').message))
    await expect(unarchivePush({ gh, git: readers, name: 'old', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: 'spawn gh ENOENT' })
  })
})
