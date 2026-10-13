import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { LocalClone } from '../../shared/project.ts'
import { splitRules } from '../engine/load-rules.ts'
import type { GhRunner } from '../inventory/github.ts'
import { brokenClone } from '../rules/sync/broken-clone.rule.ts'
import { notCloned } from '../rules/sync/not-cloned.rule.ts'
import type { GitReaders } from './action-options.ts'
import { rescanProject } from './rescan.ts'

const rules = splitRules([notCloned, brokenClone])
const apiRepo = { archived: false, fork: false, name: 'finga', owner: { login: 'Owner' }, private: false, pushed_at: '2026-01-01T00:00:00Z' }

/**
 * A fake gh that answers `api repos/Owner/finga` with the repo, or a 404
 * @param repo the API repo, `missing` for a 404
 * @returns the fake runner
 */
function fakeGh(repo: Readonly<Record<string, unknown>> | 'missing' = apiRepo) {
  return vi.fn<GhRunner>(() => Promise.resolve(repo === 'missing' ? { ok: false, stderr: 'gh: Not Found (HTTP 404)', stdout: '' } : { ok: true, stderr: '', stdout: JSON.stringify(repo) }))
}

/**
 * A clone as the inventory reads it
 * @param fields what to change
 * @returns the clone
 */
function aClone(fields: Readonly<Partial<LocalClone>> = {}): LocalClone {
  return { branches: [], changedFiles: [], currentBranch: 'main', fetchFailed: false, folderName: 'finga', localOnlyBranches: [], origin: 'git@github.com:Owner/finga.git', path: '/projects/finga', problem: undefined, slug: 'owner/finga', stashes: [], unpushed: [], ...fields }
}

/**
 * Fake git readers: the folder lists the given clones, a fresh read gives the given clone
 * @param listed the clones the folder lists
 * @param fresh the clone a fresh read gives
 * @returns the readers
 */
function readers(listed: readonly LocalClone[], fresh = aClone()): GitReaders {
  return { readClone: vi.fn<GitReaders['readClone']>(() => Promise.resolve(fresh)), readClones: vi.fn<GitReaders['readClones']>(() => Promise.resolve([...listed])) }
}

/**
 * A folder of projects, removed when the test ends
 * @returns the folder
 */
async function makeTarget() {
  const target = await mkdtemp(path.join(tmpdir(), 'repo-check-rescan-'))
  onTestFinished(() => rm(target, { force: true, recursive: true }))
  return target
}

describe(rescanProject, () => {
  it('gives a repo that is not cloned its not-cloned finding', async () => {
    expect.hasAssertions()
    const result = await rescanProject({ gh: fakeGh(), git: readers([]), name: 'finga', owner: 'Owner', rules, target: await makeTarget() })
    expect(result).toMatchObject({ ok: true, project: { findings: [{ actions: ['clone'], ruleId: 'not-cloned' }], project: { name: 'finga' } } })
  })

  it('reads the clone again with a fresh fetch, found by the repo it points to', async () => {
    expect.hasAssertions()
    const git = readers([aClone({ folderName: 'other-folder', path: '/projects/other-folder' })], aClone({ folderName: 'other-folder', path: '/projects/other-folder' }))
    const result = await rescanProject({ gh: fakeGh(), git, name: 'finga', owner: 'Owner', rules, target: await makeTarget() })
    expect(git.readClone).toHaveBeenCalledWith('/projects/other-folder', { shouldFetch: true })
    expect(result).toMatchObject({ ok: true, project: { findings: [], project: { local: { folderName: 'other-folder' }, name: 'finga' } } })
  })

  it('does not fetch a folder that is not a usable clone, found by its folder name', async () => {
    expect.hasAssertions()
    const broken = aClone({ origin: undefined, problem: 'no-git', slug: undefined })
    const git = readers([broken])
    const result = await rescanProject({ gh: fakeGh('missing'), git, name: 'finga', owner: 'Owner', rules, target: await makeTarget() })
    expect(git.readClone).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: true, project: { findings: [{ ruleId: 'broken-clone' }], project: { name: 'finga' } } })
  })

  it('says the project is gone when it has neither a repo nor a folder', async () => {
    expect.hasAssertions()
    await expect(rescanProject({ gh: fakeGh('missing'), git: readers([]), name: 'finga', owner: 'Owner', rules, target: await makeTarget() })).resolves.toStrictEqual({ ok: true, project: undefined })
  })

  it.each(['../finga', '.', '..', 'a/b', ''])('refuses the name "%s", it is not a repo name', async name => {
    expect.hasAssertions()
    await expect(rescanProject({ gh: fakeGh(), git: readers([]), name, owner: 'Owner', rules, target: await makeTarget() })).resolves.toStrictEqual({ ok: false, reason: `${name} is not a repo name` })
  })

  it('refuses when the target is a single project', async () => {
    expect.hasAssertions()
    const target = await makeTarget()
    await mkdir(path.join(target, '.git'))
    await expect(rescanProject({ gh: fakeGh(), git: readers([]), name: 'finga', owner: 'Owner', rules, target })).resolves.toStrictEqual({ ok: false, reason: 'the target is a single project, actions work on a folder of projects' })
  })

  it.each([
    ['an Error', () => Promise.reject(new Error('network down')), 'network down'],
    ['a string', () => Promise.reject(new Error('spawn gh ENOENT').message), 'spawn gh ENOENT'],
  ])('reports %s thrown while asking GitHub', async (_name, fail, reason) => {
    expect.hasAssertions()
    await expect(rescanProject({ gh: vi.fn<GhRunner>(fail), git: readers([]), name: 'finga', owner: 'Owner', rules, target: await makeTarget() })).resolves.toStrictEqual({ ok: false, reason })
  })
})
