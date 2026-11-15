import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { activeRules, createRuleSet, loadRules, splitRules } from './load-rules.ts'

const fileRule = (id: string) => ({ check: () => undefined, meta: { id, messages: {}, severity: 'info' as const } })
const projectRule = (id: string) => ({ check: () => undefined, meta: { id, messages: {}, scope: 'project' as const, severity: 'info' as const } })
const ruleSource = (id: string) => `{ check() {}, meta: { id: '${id}', messages: {}, severity: 'info' } }`

/**
 * Create a throwaway rules folder, removed when the test ends
 * @returns the folder path
 */
async function makeRulesFolder() {
  const folder = await mkdtemp(path.join(tmpdir(), 'repo-check-rules-'))
  await mkdir(path.join(folder, 'scripts'))
  await writeFile(path.join(folder, 'scripts/b.rule.js'), `export const ruleB = ${ruleSource('b')}\nexport const helper = () => 1\n`)
  await writeFile(path.join(folder, 'a.rule.js'), `export const table = [${ruleSource('a1')}, ${ruleSource('a2')}]\nexport const nothing = null\n`)
  await writeFile(path.join(folder, 'factories.js'), `export const notLoaded = ${ruleSource('factory')}\n`)
  await writeFile(path.join(folder, 'a.test.js'), `export const notLoaded = ${ruleSource('test')}\n`)
  onTestFinished(() => rm(folder, { force: true, recursive: true }))
  return folder
}

describe('rules loader', () => {
  it('collects the rules of *.rule files only, single or in tables, ordered by path', async () => {
    expect.hasAssertions()
    const rules = await loadRules(await makeRulesFolder())
    expect(rules.map(rule => rule.meta.id)).toStrictEqual(['a1', 'a2', 'b'])
  })

  it('splits file rules from project rules, keeping their order', () => {
    expect.hasAssertions()
    const { fileRules, projectRules } = splitRules([fileRule('a'), projectRule('b'), fileRule('c'), projectRule('d')])
    expect(fileRules.map(item => item.meta.id)).toStrictEqual(['a', 'c'])
    expect(projectRules.map(item => item.meta.id)).toStrictEqual(['b', 'd'])
  })
})

describe('nitpick rules', () => {
  const nitpick = { ...fileRule('nit'), meta: { ...fileRule('nit').meta, nitpick: true } }
  const rules = [fileRule('plain'), nitpick, projectRule('sync')]

  it('keeps the nitpick rules only in nitpick mode', () => {
    expect.hasAssertions()
    expect(activeRules(rules, false).map(rule => rule.meta.id)).toStrictEqual(['plain', 'sync'])
    expect(activeRules(rules, true).map(rule => rule.meta.id)).toStrictEqual(['plain', 'nit', 'sync'])
  })

  it('gives a rule set whose lists follow the mode', () => {
    expect.hasAssertions()
    const set = createRuleSet(rules, false)
    expect(set.fileRules.map(rule => rule.meta.id)).toStrictEqual(['plain'])
    expect(set.projectRules).toHaveLength(1)
    set.isNitpick = true
    expect(set.fileRules.map(rule => rule.meta.id)).toStrictEqual(['plain', 'nit'])
    expect(set.projectRules).toHaveLength(1)
  })
})
