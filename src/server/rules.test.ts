import { readFileSync } from 'node:fs'
import { glob } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { isRule, loadRules, splitRules } from './engine/load-rules.ts'

const folder = path.join(import.meta.dirname, 'rules')
const checksDoc = readFileSync(path.join(import.meta.dirname, '../../docs/checks.md'), 'utf8')
const rules = await loadRules(folder)
const ids = rules.map(rule => rule.meta.id)
const builtIds = [...checksDoc.matchAll(/^- (?:🚀|✅) \S+ `(?<id>[a-z0-9-]+)`:/gmu)].map(match => String(match.groups?.id))
const entries = await Array.fromAsync(glob('**/*', { cwd: folder, withFileTypes: true }))
const files = entries.filter(entry => entry.isFile()).map(entry => path.relative(folder, path.join(entry.parentPath, entry.name)))

/**
 * Tell if a file of the rules folder follows the layout: inside a group folder, named *.rule.ts, *.utils.ts or *.test.ts
 * @param file the path relative to the rules folder
 * @returns true if the file is well placed and named
 */
function isWellPlaced(file: string) {
  return file.includes(path.sep) && /\.(?:rule|utils|test)\.ts$/u.test(file)
}

/**
 * Tell if a file exports a rule, alone or in an array
 * @param file the path relative to the rules folder
 * @returns true if one of its exports is a rule
 */
async function exportsRule(file: string) {
  const exports = (await import(pathToFileURL(path.join(folder, file)).href)) as Record<string, unknown>
  return Object.values(exports)
    .flat()
    .some(value => isRule(value))
}

describe('rules folder', () => {
  it('finds the rules', () => {
    expect.hasAssertions()
    expect(ids).toContain('scripts-no-npm-run')
  })

  it('has project rules in sync, in the clone state of git-hygiene and in the GitHub metadata of presentation, and file rules everywhere else', () => {
    expect.hasAssertions()
    const { projectRules } = splitRules(rules)
    expect(projectRules.map(rule => rule.meta.id).toSorted()).toStrictEqual([
      'archived-clone',
      'archived-with-unsaved-work',
      'behind-remote',
      'branch-without-upstream',
      'broken-clone',
      'forgotten-stash',
      'missing-description',
      'missing-homepage',
      'missing-license',
      'missing-topics',
      'not-cloned',
      'not-on-default-branch',
      'pristine-fork',
      'uncommitted-files',
      'unpushed-commits',
    ])
  })

  it.each(builtIds)('%s, marked built in docs/checks.md, has a rule', id => {
    expect.hasAssertions()
    expect(ids).toContain(id)
  })

  it('has unique ids', () => {
    expect.hasAssertions()
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(ids)('%s is marked built (🚀 or ✅) in docs/checks.md', id => {
    expect.hasAssertions()
    expect(builtIds).toContain(id)
  })

  it('only has *.rule.ts, *.utils.ts and *.test.ts files, inside group folders', () => {
    expect.hasAssertions()
    expect(files.filter(file => !isWellPlaced(file))).toStrictEqual([])
  })

  it('has no rule exported by a *.utils.ts file, the loader would skip it', async () => {
    expect.hasAssertions()
    const utilsFiles = files.filter(file => file.endsWith('.utils.ts'))
    const hasRules = await Promise.all(utilsFiles.map(file => exportsRule(file)))
    expect(utilsFiles.filter((_file, index) => hasRules[index])).toStrictEqual([])
  })
})
