import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { LocalClone } from '../../shared/project.ts'
import type { GhRunner } from '../inventory/github.ts'
import type { ShellResult } from '../inventory/shell.ts'
import { checkoutDefault } from './checkout-default.ts'
import type { GitReaders } from './action-options.ts'

const apiRepo = (fields: Readonly<Record<string, unknown>> = {}) => ({ archived: false, default_branch: 'master', fork: false, name: 'finga', owner: { login: 'Owner' }, private: false, pushed_at: '2026-01-01T00:00:00Z', ...fields })
const fakeGh = (repo: Readonly<Record<string, unknown>> | undefined) => vi.fn<GhRunner>(() => Promise.resolve(repo === undefined ? { ok: false, stderr: 'HTTP 404: Not Found', stdout: '' } : { ok: true, stderr: '', stdout: JSON.stringify(repo) }))
const aClone = (fields: Partial<LocalClone> = {}) =>
  ({ branches: [], changedFiles: [], currentBranch: 'feat', fetchFailed: false, folderName: 'finga', localOnlyBranches: [], origin: undefined, path: '/projects/finga', problem: undefined, slug: 'owner/finga', stashes: [], unpushed: [], ...fields }) satisfies LocalClone
const fakeReaders = (clone: LocalClone): GitReaders => ({ listClones: () => Promise.resolve([clone]), readClone: () => Promise.resolve(clone) })
const fakeGit = (isWorking = true) => vi.fn<(args: readonly string[], cwd: string) => Promise<ShellResult>>(() => Promise.resolve({ ok: isWorking, stderr: isWorking ? '' : 'error: pathspec did not match', stdout: '' }))

/**
 * Create a folder of projects, removed when the test ends
 * @returns the folder path
 */
async function makeTarget() {
  const target = await mkdtemp(path.join(tmpdir(), 'repo-check-checkout-'))
  onTestFinished(() => rm(target, { force: true, recursive: true }))
  return target
}

describe(checkoutDefault, () => {
  it('checks the default branch out in the clone', async () => {
    expect.hasAssertions()
    const runGit = fakeGit()
    const result = await checkoutDefault({ gh: fakeGh(apiRepo()), git: fakeReaders(aClone()), name: 'finga', owner: 'Owner', runGit, target: await makeTarget() })
    expect(result).toStrictEqual({ message: 'checked out master in /projects/finga', ok: true })
    expect(runGit).toHaveBeenCalledWith(['checkout', 'master'], '/projects/finga')
  })

  it.each([
    { clone: aClone(), name: 'finga', reason: 'does not exist on GitHub any more', repo: undefined, title: 'a repo gone from GitHub' },
    { clone: aClone(), name: 'finga', reason: 'is archived now', repo: apiRepo({ archived: true }), title: 'an archived repo' },
    { clone: aClone({ currentBranch: 'master' }), name: 'finga', reason: 'already on master', repo: apiRepo(), title: 'a clone already on the default branch' },
    { clone: aClone({ changedFiles: [' M a.ts'] }), name: 'finga', reason: '1 uncommitted file(s)', repo: apiRepo(), title: 'a clone with uncommitted files' },
    { clone: aClone({ problem: 'no-origin' }), name: 'finga', reason: 'cannot be read', repo: apiRepo(), title: 'a broken clone' },
    { clone: aClone(), name: 'finga', reason: 'is not a branch name', repo: apiRepo({ default_branch: '--orphan' }), title: 'a default branch named like a flag' },
  ])('refuses $title', async ({ clone, name, reason, repo }) => {
    expect.hasAssertions()
    const runGit = fakeGit()
    const gh = fakeGh(repo)
    const result = await checkoutDefault({ gh, git: fakeReaders(clone), name, owner: 'Owner', runGit, target: await makeTarget() })
    const expected = expect.stringContaining(reason) as string
    expect(result).toMatchObject({ ok: false, reason: expected })
    expect(runGit).not.toHaveBeenCalled()
  })

  it('refuses when the target is a single project', async () => {
    expect.hasAssertions()
    const target = await makeTarget()
    await mkdir(path.join(target, '.git'))
    const gh = fakeGh(apiRepo())
    const result = await checkoutDefault({ gh, git: fakeReaders(aClone()), name: 'finga', owner: 'Owner', runGit: fakeGit(), target })
    expect(result.ok).toBe(false)
  })

  it('gives the reason when git fails', async () => {
    expect.hasAssertions()
    const result = await checkoutDefault({ gh: fakeGh(apiRepo()), git: fakeReaders(aClone()), name: 'finga', owner: 'Owner', runGit: fakeGit(false), target: await makeTarget() })
    expect(result).toStrictEqual({ ok: false, reason: 'git checkout master failed: error: pathspec did not match' })
  })

  it('runs the real git by default, which refuses outside a repository', async () => {
    expect.hasAssertions()
    const target = await makeTarget()
    const result = await checkoutDefault({ gh: fakeGh(apiRepo()), git: fakeReaders(aClone({ path: target })), name: 'finga', owner: 'Owner', target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('git checkout master failed') as string })
  })

  it('gives the reason when something throws', async () => {
    expect.hasAssertions()
    const gh = vi.fn<GhRunner>(() => Promise.reject(new Error('boom')))
    const result = await checkoutDefault({ gh, git: fakeReaders(aClone()), name: 'finga', owner: 'Owner', runGit: fakeGit(), target: await makeTarget() })
    expect(result).toStrictEqual({ ok: false, reason: 'boom' })
  })

  it('refuses when no clone of the repo is found', async () => {
    expect.hasAssertions()
    const git: GitReaders = { listClones: () => Promise.resolve([]), readClone: () => Promise.resolve(aClone()) }
    const result = await checkoutDefault({ gh: fakeGh(apiRepo()), git, name: 'finga', owner: 'Owner', runGit: fakeGit(), target: await makeTarget() })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('no clone of') as string })
  })

  it('refuses when two clones of the repo are found', async () => {
    expect.hasAssertions()
    const git: GitReaders = { listClones: () => Promise.resolve([aClone(), aClone()]), readClone: () => Promise.resolve(aClone()) }
    const result = await checkoutDefault({ gh: fakeGh(apiRepo()), git, name: 'finga', owner: 'Owner', runGit: fakeGit(), target: await makeTarget() })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('2 clones of') as string })
  })

  it('gives the text of something thrown that is not an error', async () => {
    expect.hasAssertions()
    const gh = vi.fn<GhRunner>(() => Promise.reject(new TypeError('x', { cause: 'plain' }).cause))
    const result = await checkoutDefault({ gh, git: fakeReaders(aClone()), name: 'finga', owner: 'Owner', runGit: fakeGit(), target: await makeTarget() })
    expect(result).toStrictEqual({ ok: false, reason: 'plain' })
  })
})
