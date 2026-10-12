import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { loadRules } from './load-rules.ts'

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
})
