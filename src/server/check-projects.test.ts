import type { LocalClone, Project } from '../shared/project.ts'
import { checkProjects } from './check-projects.ts'
import { defineProjectRule } from './engine/define-project-rule.ts'
import type { GhRunner } from './inventory/github.ts'
import { createProjectMemory } from './project-memory.ts'

const repo = (name: string, isFork: boolean) => ({
  defaultBranch: 'main',
  description: 'a repo',
  forkStatus: undefined,
  hasLicense: true,
  homepage: 'https://example.com',
  isArchived: false,
  isFork,
  isPrivate: false,
  name,
  openItems: 0,
  owner: 'owner',
  pullRequests: undefined,
  pushedAt: '2026-01-01T00:00:00Z',
  slug: `owner/${name}`,
  topics: ['tool'],
})
const project = (name: string, isFork = false): Project => ({ github: repo(name, isFork), isOtherOwner: false, local: undefined, name })

/**
 * A project rule that throws for the project named `bad` and passes for the others, with what it throws
 * @param thrown what the rule throws
 * @returns the rules split by flavor
 */
function rulesThrowing(thrown: unknown) {
  const rule = defineProjectRule({
    check({ project: checked }) {
      if (checked.name === 'bad') throw thrown
    },
    meta: { id: 'always-fails-on-bad', messages: {}, severity: 'warning' },
  })
  return { fileRules: [], projectRules: [rule] }
}

/**
 * A clone as the inventory reads it
 * @param fields what to change
 * @returns the clone
 */
function aClone(fields: Readonly<Partial<LocalClone>> = {}): LocalClone {
  return { branches: [], changedFiles: [], currentBranch: 'main', fetchFailed: false, folderName: 'app', localOnlyBranches: [], origin: 'git@github.com:owner/app.git', path: '/projects/app', problem: undefined, slug: 'owner/app', stashes: [], unpushed: [], ...fields }
}

/**
 * A project that has a clone
 * @param name the project name
 * @param fields what to change in the clone
 * @param isFork true for a fork
 * @returns the project
 */
function cloned(name: string, fields: Readonly<Partial<LocalClone>> = {}, isFork = false): Project {
  return { ...project(name, isFork), local: aClone({ folderName: name, path: `/projects/${name}`, ...fields }) }
}

/**
 * Read a clone again with a fetch: the checked out branch becomes `fetched`
 * @param local the clone
 * @returns the fresh clone
 */
function fresh(local: LocalClone): Promise<LocalClone> {
  return Promise.resolve({ ...local, currentBranch: 'fetched' })
}

/**
 * Read a clone again with a fetch, except the clone of the project `bad`, whose fetch throws
 * @param local the clone
 * @returns the fresh clone
 */
function freshExceptBad(local: LocalClone): Promise<LocalClone> {
  return local.folderName === 'bad' ? Promise.reject(new Error('git is gone')) : fresh(local)
}

/**
 * A rule that counts how many times it runs
 * @param calls the counter
 * @returns the rules split by flavor
 */
function rulesCounting(calls: string[]) {
  const rule = defineProjectRule({
    check({ project: checked }) {
      calls.push(checked.name)
    },
    meta: { id: 'counts-runs', messages: {}, severity: 'warning' },
  })
  return { fileRules: [], projectRules: [rule] }
}

describe(checkProjects, () => {
  it.each([
    ['an Error', new Error('boom'), 'the checks of this project failed: boom'],
    ['a string', 'boom', 'the checks of this project failed: boom'],
  ])('gives a project whose checks throw %s an error finding, and checks the others', async (_name, thrown, message) => {
    expect.hasAssertions()
    const seen: string[] = []
    const gh = vi.fn<GhRunner>()
    const results = await checkProjects([project('good'), project('bad')], { gh, onProgress: () => undefined, onProject: result => seen.push(result.project.name), refresh: undefined, rules: rulesThrowing(thrown) })
    expect(results.map(result => [result.project.name, result.findings.map(finding => finding.message)])).toStrictEqual([
      ['bad', [message]],
      ['good', []],
    ])
    expect(results[0]?.findings[0]).toMatchObject({ messageId: 'failed', ruleId: 'checks-failed', scope: 'project', severity: 'error' })
    expect(seen.toSorted()).toStrictEqual(['bad', 'good'])
  })

  it('gives a fork whose comparison throws an error finding, and keeps going', async () => {
    expect.hasAssertions()
    const gh = vi.fn<GhRunner>(() => Promise.reject(new Error('network down')))
    const results = await checkProjects([project('lib', true), project('app')], { gh, onProgress: () => undefined, onProject: () => undefined, refresh: undefined, rules: rulesThrowing('never') })
    expect(results.map(result => [result.project.name, result.findings.map(finding => finding.message)])).toStrictEqual([
      ['app', []],
      ['lib', ['the checks of this project failed: network down']],
    ])
  })

  describe('with a fetch before each check', () => {
    it('reads a usable clone again with a fetch right before its check, a fork after its comparison', async () => {
      expect.hasAssertions()
      const lines: string[] = []
      const refresh = vi.fn<(local: LocalClone) => Promise<LocalClone>>(fresh)
      const gh = vi.fn<GhRunner>(() => Promise.resolve({ ok: false, stderr: 'gh: Not Found (HTTP 404)', stdout: '' }))
      const results = await checkProjects([cloned('app'), cloned('lib', {}, true)], { gh, onProgress: line => lines.push(line), onProject: () => undefined, refresh, rules: rulesThrowing('never') })
      expect(results.map(result => result.project.local?.currentBranch)).toStrictEqual(['fetched', 'fetched'])
      expect(refresh).toHaveBeenCalledTimes(2)
      expect(lines[0]).toBe('checking 2 projects, each clone is fetched just before its check')
    })

    it('does not fetch a folder that is not a usable clone, nor a repo that is not cloned', async () => {
      expect.hasAssertions()
      const refresh = vi.fn<(local: LocalClone) => Promise<LocalClone>>(fresh)
      await checkProjects([cloned('broken', { problem: 'no-git' }), project('remote-only')], { gh: vi.fn<GhRunner>(), onProgress: () => undefined, onProject: () => undefined, refresh, rules: rulesThrowing('never') })
      expect(refresh).not.toHaveBeenCalled()
    })

    it('gives a project whose fetch throws an error finding, the others are checked', async () => {
      expect.hasAssertions()
      const refresh = freshExceptBad
      const results = await checkProjects([cloned('bad'), cloned('good')], { gh: vi.fn<GhRunner>(), onProgress: () => undefined, onProject: () => undefined, refresh, rules: rulesThrowing('never') })
      expect(results.map(result => [result.project.name, result.findings.map(finding => finding.message)])).toStrictEqual([
        ['bad', ['the checks of this project failed: git is gone']],
        ['good', []],
      ])
    })
  })

  describe('with a memory of the results', () => {
    it('does not check again a project whose clone did not change, but still reports it', async () => {
      expect.hasAssertions()
      const [calls, seen] = [new Array<string>(), new Array<string>()]
      const memory = createProjectMemory()
      const options = { gh: vi.fn<GhRunner>(), memory, onProgress: () => undefined, onProject: (result: { project: Project }) => seen.push(result.project.name), refresh: undefined, rules: rulesCounting(calls) }
      await checkProjects([project('app')], options)
      await checkProjects([project('app')], options)
      expect(calls).toStrictEqual(['app'])
      expect(seen).toStrictEqual(['app', 'app'])
    })

    it('checks every project again when the scan must be fresh, and remembers the new results', async () => {
      expect.hasAssertions()
      const calls: string[] = []
      const memory = createProjectMemory()
      const options = { gh: vi.fn<GhRunner>(), memory, onProgress: () => undefined, onProject: () => undefined, refresh: undefined, rules: rulesCounting(calls) }
      await checkProjects([project('app')], options)
      await checkProjects([project('app')], { ...options, shouldReuse: false })
      expect(calls).toStrictEqual(['app', 'app'])
      await checkProjects([project('app')], options)
      expect(calls).toStrictEqual(['app', 'app'])
    })

    it('does not remember a project whose checks failed', async () => {
      expect.hasAssertions()
      const memory = createProjectMemory()
      await checkProjects([project('bad')], { gh: vi.fn<GhRunner>(), memory, onProgress: () => undefined, onProject: () => undefined, refresh: undefined, rules: rulesThrowing('boom') })
      expect(memory.entry('bad')).toBeUndefined()
    })
  })
})
