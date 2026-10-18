import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { LocalClone } from '../../shared/project.ts'
import type { ProjectResult } from '../check-projects.ts'
import { makeRepo } from '../git-fixtures.ts'
import type { GhRunner } from '../inventory/github.ts'
import { createProjectMemory, pauseMs, remoteTtlMs } from '../project-memory.ts'
import type { GitReaders } from './action-options.ts'
import { liveProject } from './live.ts'

const rules = { fileRules: [], projectRules: [] }
const target = '/nowhere'
const apiRepo = { archived: false, fork: false, name: 'finga', owner: { login: 'Owner' }, private: false, pushed_at: '2026-01-01T00:00:00Z' }

/**
 * A fake gh that answers the repo, and the rate limit
 * @param calls the calls GitHub says are left, `down` to fail
 * @param repo the API repo, `missing` for a 404
 * @returns the fake runner
 */
function fakeGh(calls: number | 'down' = 5000, repo: Readonly<Record<string, unknown>> | 'missing' = apiRepo) {
  return vi.fn<GhRunner>(args => {
    if (args[1] === 'rate_limit') return Promise.resolve(calls === 'down' ? { ok: false, stderr: 'down', stdout: '' } : { ok: true, stderr: '', stdout: `${calls}\n` })
    return Promise.resolve(repo === 'missing' ? { ok: false, stderr: 'gh: Not Found (HTTP 404)', stdout: '' } : { ok: true, stderr: '', stdout: JSON.stringify(repo) })
  })
}

/**
 * A clone in a folder
 * @param folder the folder
 * @param fields what to change
 * @returns the clone
 */
function aClone(folder: string, fields: Readonly<Partial<LocalClone>> = {}): LocalClone {
  return { branches: [], changedFiles: [], currentBranch: 'main', fetchFailed: false, folderName: 'finga', localOnlyBranches: [], origin: 'git@github.com:Owner/finga.git', path: folder, problem: undefined, slug: 'owner/finga', stashes: [], unpushed: [], ...fields }
}

/**
 * Fake git readers, a read gives the given clone
 * @param clone the clone
 * @returns the readers
 */
function readers(clone: LocalClone): GitReaders {
  return { readClone: vi.fn<GitReaders['readClone']>(() => Promise.resolve(clone)), readClones: vi.fn<GitReaders['readClones']>(() => Promise.resolve([clone])) }
}

/**
 * Everything a watch needs, with a project remembered as checked with a real clone
 * @param time the clock, changed by the test
 * @returns the pieces
 */
async function setup(time: Readonly<{ now: number }>) {
  const memory = createProjectMemory(() => time.now)
  const folder = await makeRepo()
  const clone = aClone(folder)
  const result: ProjectResult = { findings: [], outcomes: [], project: { github: undefined, isOtherOwner: false, local: clone, name: 'finga' } }
  const first = await memory.recall(result.project, true)
  memory.remember(result, first.fingerprint)
  return { clone, fingerprint: first.fingerprint, folder, git: readers(clone), memory }
}

describe(liveProject, () => {
  it('scans the project alone the first time, and remembers it', async () => {
    expect.hasAssertions()
    const memory = createProjectMemory()
    const answer = await liveProject({ gh: fakeGh(), git: readers(aClone('/nowhere')), memory, name: 'finga', owner: 'Owner', rules, since: '', target })
    expect(answer).toMatchObject({ changed: true, ok: true, project: { project: { name: 'finga' } }, remote: 'fresh', target })
    expect(memory.entry('finga')).toBeDefined()
  })

  it('says the project is gone when it has neither a repo nor a folder', async () => {
    expect.hasAssertions()
    const memory = createProjectMemory()
    const answer = await liveProject({ gh: fakeGh(5000, 'missing'), git: { readClone: vi.fn<GitReaders['readClone']>(), readClones: vi.fn<GitReaders['readClones']>(() => Promise.resolve([])) }, memory, name: 'finga', owner: 'Owner', rules, since: '', target })
    expect(answer).toStrictEqual({ changed: true, fingerprint: '', ok: true, project: undefined, remote: 'fresh', target })
  })

  it('reports why the project could not be scanned', async () => {
    expect.hasAssertions()
    const answer = await liveProject({ gh: fakeGh(), git: readers(aClone('/nowhere')), memory: createProjectMemory(), name: '../x', owner: 'Owner', rules, since: '', target })
    expect(answer).toStrictEqual({ ok: false, reason: '../x is not a repo name' })
  })

  it('says nothing changed, without a call to GitHub or a read of the clone, when the page holds the fingerprint', async () => {
    expect.hasAssertions()
    const { fingerprint, git, memory } = await setup({ now: 1_000_000 })
    const gh = fakeGh()
    const answer = await liveProject({ gh, git, memory, name: 'finga', owner: 'Owner', rules, since: fingerprint, target })
    expect(answer).toStrictEqual({ changed: false, fingerprint, ok: true, remote: 'fresh' })
    expect(gh).not.toHaveBeenCalled()
    expect(git.readClone).not.toHaveBeenCalled()
  })

  it('says nothing changed on the first question, when the page holds no fingerprint yet', async () => {
    expect.hasAssertions()
    const { fingerprint, git, memory } = await setup({ now: 1_000_000 })
    await expect(liveProject({ gh: fakeGh(), git, memory, name: 'finga', owner: 'Owner', rules, since: '', target })).resolves.toStrictEqual({ changed: false, fingerprint, ok: true, remote: 'fresh' })
    expect(git.readClone).not.toHaveBeenCalled()
  })

  it('gives the project when the page holds another fingerprint', async () => {
    expect.hasAssertions()
    const { fingerprint, git, memory } = await setup({ now: 1_000_000 })
    const answer = await liveProject({ gh: fakeGh(), git, memory, name: 'finga', owner: 'Owner', rules, since: 'old', target })
    expect(answer).toMatchObject({ changed: true, fingerprint, ok: true, project: { project: { name: 'finga' } } })
  })

  it('checks again from a fresh read of the clone when it changed, without fetch nor GitHub, and keeps the GitHub side', async () => {
    expect.hasAssertions()
    const { clone, fingerprint, folder, git, memory } = await setup({ now: 1_000_000 })
    const remoteAt = memory.entry('finga')?.remoteAt
    await writeFile(path.join(folder, 'notes.txt'), 'hello')
    const gh = fakeGh()
    const answer = await liveProject({ gh, git, memory, name: 'finga', owner: 'Owner', rules, since: fingerprint, target })
    expect(answer).toMatchObject({ changed: true, ok: true, project: { project: { name: 'finga' } }, remote: 'fresh', target })
    expect(answer).toMatchObject({ fingerprint: expect.not.stringMatching(fingerprint) })
    expect(git.readClone).toHaveBeenCalledWith(clone.path, { shouldFetch: false })
    expect(gh).not.toHaveBeenCalled()
    expect(memory.entry('finga')).toMatchObject({ isPaused: false, remoteAt })
  })

  it('checks the project again when it has no clone but the page holds another fingerprint', async () => {
    expect.hasAssertions()
    const memory = createProjectMemory()
    memory.remember({ findings: [], outcomes: [], project: { github: undefined, isOtherOwner: false, local: undefined, name: 'finga' } }, '')
    const git = readers(aClone('/nowhere'))
    const answer = await liveProject({ gh: fakeGh(), git, memory, name: 'finga', owner: 'Owner', rules, since: 'old', target })
    expect(answer).toMatchObject({ changed: true, ok: true })
    expect(git.readClone).not.toHaveBeenCalled()
  })

  it('reports why a clone could not be read again', async () => {
    expect.hasAssertions()
    const { folder, fingerprint, memory } = await setup({ now: 1_000_000 })
    await writeFile(path.join(folder, 'notes.txt'), 'hello')
    const git: GitReaders = { readClone: vi.fn<GitReaders['readClone']>(() => Promise.reject(new Error('git is gone'))), readClones: vi.fn<GitReaders['readClones']>() }
    await expect(liveProject({ gh: fakeGh(), git, memory, name: 'finga', owner: 'Owner', rules, since: fingerprint, target })).resolves.toStrictEqual({ ok: false, reason: 'git is gone' })
  })

  it('reports a failure that is not an error', async () => {
    expect.hasAssertions()
    const { folder, fingerprint, memory } = await setup({ now: 1_000_000 })
    await writeFile(path.join(folder, 'notes.txt'), 'hello')
    const git: GitReaders = { readClone: vi.fn<GitReaders['readClone']>(() => Promise.reject(new Error('boom').message)), readClones: vi.fn<GitReaders['readClones']>() }
    await expect(liveProject({ gh: fakeGh(), git, memory, name: 'finga', owner: 'Owner', rules, since: fingerprint, target })).resolves.toStrictEqual({ ok: false, reason: 'boom' })
  })

  describe('once the GitHub side is due', () => {
    it.each<[string, number | 'down']>([
      ['plenty of calls are left', 5000],
      ['GitHub cannot say how many calls are left', 'down'],
    ])('reads the project again when %s', async (_name, calls) => {
      expect.hasAssertions()
      const time = { now: 1_000_000 }
      const { git, memory } = await setup(time)
      time.now += remoteTtlMs
      const gh = fakeGh(calls)
      const answer = await liveProject({ gh, git, memory, name: 'finga', owner: 'Owner', rules, since: '', target })
      expect(answer).toMatchObject({ changed: true, ok: true, remote: 'fresh' })
      expect(gh).toHaveBeenCalledWith(['api', 'repos/Owner/finga'])
      expect(memory.entry('finga')?.remoteAt).toBe(time.now)
    })

    it('does not spend calls when the rate limit is low, says so, and looks at the rate limit again only after a minute', async () => {
      expect.hasAssertions()
      const time = { now: 1_000_000 }
      const { fingerprint, git, memory } = await setup(time)
      time.now += remoteTtlMs
      const gh = fakeGh(10)
      const options = { gh, git, memory, name: 'finga', owner: 'Owner', rules, since: fingerprint, target }
      await expect(liveProject(options)).resolves.toStrictEqual({ changed: false, fingerprint, ok: true, remote: 'paused' })
      await expect(liveProject(options)).resolves.toStrictEqual({ changed: false, fingerprint, ok: true, remote: 'paused' })
      expect(gh).toHaveBeenCalledOnce()
      expect(gh).not.toHaveBeenCalledWith(['api', 'repos/Owner/finga'])
      time.now += pauseMs
      await liveProject({ ...options, gh: fakeGh(5000) })
      expect(memory.entry('finga')).toMatchObject({ isPaused: false, remoteAt: time.now })
    })

    it('still checks the clone again while paused, and stays paused', async () => {
      expect.hasAssertions()
      const time = { now: 1_000_000 }
      const { fingerprint, folder, git, memory } = await setup(time)
      time.now += remoteTtlMs
      await writeFile(path.join(folder, 'notes.txt'), 'hello')
      const answer = await liveProject({ gh: fakeGh(10), git, memory, name: 'finga', owner: 'Owner', rules, since: fingerprint, target })
      expect(answer).toMatchObject({ changed: true, ok: true, remote: 'paused' })
      expect(memory.entry('finga')?.isPaused).toBe(true)
    })
  })
})
