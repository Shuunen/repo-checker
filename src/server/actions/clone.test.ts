import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { GhRunner } from '../inventory/github.ts'
import { cloneRepo } from './clone.ts'

const apiRepo = (fields: Readonly<Record<string, unknown>> = {}) => ({ archived: false, fork: false, name: 'finga', owner: { login: 'Owner' }, private: false, pushed_at: '2026-01-01T00:00:00Z', ...fields })

/**
 * A fake gh: `api repos/Owner/finga` answers the given repo (or the given failure), `repo clone` answers the given outcome
 * @param repo the API repo, or the failure text
 * @param clone whether `gh repo clone` works
 * @returns the fake runner
 */
function fakeGh(repo: Readonly<Record<string, unknown>> | string, clone = true) {
  return vi.fn<GhRunner>(args => {
    if (args[0] === 'repo') return Promise.resolve({ ok: clone, stderr: clone ? '' : 'fatal: could not read from remote', stdout: '' })
    return Promise.resolve(typeof repo === 'string' ? { ok: false, stderr: repo, stdout: '' } : { ok: true, stderr: '', stdout: JSON.stringify(repo) })
  })
}

/**
 * Create a folder of projects, removed when the test ends
 * @returns the folder path
 */
async function makeTarget() {
  const target = await mkdtemp(path.join(tmpdir(), 'repo-check-clone-'))
  onTestFinished(() => rm(target, { force: true, recursive: true }))
  return target
}

describe(cloneRepo, () => {
  it('clones a repo of the owner with gh, into a folder of its name', async () => {
    expect.hasAssertions()
    const target = await makeTarget()
    const gh = fakeGh(apiRepo())
    const result = await cloneRepo({ gh, name: 'finga', owner: 'Owner', target })
    expect(result).toStrictEqual({ message: `cloned Owner/finga into ${path.join(target, 'finga')}`, ok: true })
    expect(gh).toHaveBeenLastCalledWith(['repo', 'clone', 'Owner/finga', path.join(target, 'finga')])
  })

  it.each(['../finga', '.', '..', 'a b', 'a/b', ''])('refuses the name "%s", it is not a repo name', async name => {
    expect.hasAssertions()
    const gh = fakeGh(apiRepo())
    await expect(cloneRepo({ gh, name, owner: 'Owner', target: await makeTarget() })).resolves.toStrictEqual({ ok: false, reason: `${name} is not a repo name` })
    expect(gh).not.toHaveBeenCalled()
  })

  it('refuses when the target is a single project', async () => {
    expect.hasAssertions()
    const target = await makeTarget()
    await mkdir(path.join(target, '.git'))
    const gh = fakeGh(apiRepo())
    await expect(cloneRepo({ gh, name: 'finga', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: 'the target is a single project, clones go in a folder of projects' })
    expect(gh).not.toHaveBeenCalled()
  })

  it('refuses when a folder of that name already exists, and asks GitHub nothing', async () => {
    expect.hasAssertions()
    const target = await makeTarget()
    await mkdir(path.join(target, 'finga'))
    const gh = fakeGh(apiRepo())
    await expect(cloneRepo({ gh, name: 'finga', owner: 'Owner', target })).resolves.toStrictEqual({ ok: false, reason: `a folder named finga already exists in ${target}` })
    expect(gh).not.toHaveBeenCalled()
  })

  it.each([
    ['is gone from GitHub', 'gh: Not Found (HTTP 404)', 'Owner/finga does not exist on GitHub any more'],
    ['was renamed', apiRepo({ name: 'finga-2' }), 'Owner/finga was renamed or moved to owner/finga-2, scan again'],
    ['is archived now', apiRepo({ archived: true }), 'Owner/finga is archived now, it is not offered for cloning'],
    ['is a fork', apiRepo({ fork: true }), 'Owner/finga is a fork, it is not offered for cloning'],
  ])('refuses a repo that %s', async (_name, repo, reason) => {
    expect.hasAssertions()
    const gh = fakeGh(repo)
    await expect(cloneRepo({ gh, name: 'finga', owner: 'Owner', target: await makeTarget() })).resolves.toStrictEqual({ ok: false, reason })
    expect(gh).toHaveBeenCalledOnce()
  })

  it('reports a gh failure on the repo check', async () => {
    expect.hasAssertions()
    const result = await cloneRepo({ gh: fakeGh('gh: To get started with GitHub CLI, please run: gh auth login'), name: 'finga', owner: 'Owner', target: await makeTarget() })
    expect(result).toStrictEqual({ ok: false, reason: 'gh api repos/Owner/finga failed: gh: To get started with GitHub CLI, please run: gh auth login' })
  })

  it('reports a failure that is not an Error', async () => {
    expect.hasAssertions()
    const gh = vi.fn<GhRunner>(() => Promise.reject(new Error('spawn gh ENOENT').message))
    await expect(cloneRepo({ gh, name: 'finga', owner: 'Owner', target: await makeTarget() })).resolves.toStrictEqual({ ok: false, reason: 'spawn gh ENOENT' })
  })

  it('reports a failed clone', async () => {
    expect.hasAssertions()
    const result = await cloneRepo({ gh: fakeGh(apiRepo(), false), name: 'finga', owner: 'Owner', target: await makeTarget() })
    expect(result).toStrictEqual({ ok: false, reason: 'gh repo clone Owner/finga failed: fatal: could not read from remote' })
  })
})
