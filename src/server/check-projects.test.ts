import type { Project } from '../shared/project.ts'
import { checkProjects } from './check-projects.ts'
import { defineProjectRule } from './engine/define-project-rule.ts'
import type { GhRunner } from './inventory/github.ts'

const repo = (name: string, isFork: boolean) => ({ forkStatus: undefined, isArchived: false, isFork, isPrivate: false, name, owner: 'owner', pushedAt: '2026-01-01T00:00:00Z', slug: `owner/${name}` })
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

describe(checkProjects, () => {
  it.each([
    ['an Error', new Error('boom'), 'the checks of this project failed: boom'],
    ['a string', 'boom', 'the checks of this project failed: boom'],
  ])('gives a project whose checks throw %s an error finding, and checks the others', async (_name, thrown, message) => {
    expect.hasAssertions()
    const seen: string[] = []
    const gh = vi.fn<GhRunner>()
    const results = await checkProjects([project('good'), project('bad')], { gh, onProgress: () => undefined, onProject: result => seen.push(result.project.name), rules: rulesThrowing(thrown) })
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
    const results = await checkProjects([project('lib', true), project('app')], { gh, onProgress: () => undefined, onProject: () => undefined, rules: rulesThrowing('never') })
    expect(results.map(result => [result.project.name, result.findings.map(finding => finding.message)])).toStrictEqual([
      ['app', []],
      ['lib', ['the checks of this project failed: network down']],
    ])
  })
})
