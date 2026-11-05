import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { LocalClone } from '../shared/project.ts'
import type { GitReaders } from './actions/action-options.ts'
import type { ProjectResult } from './check-projects.ts'
import { defineRule } from './engine/define-rule.ts'
import { splitRules } from './engine/load-rules.ts'
import { fixProjects } from './fix-projects.ts'
import type { GhRunner } from './inventory/github.ts'

/** Rewrites `old` to `new` in `a.txt` */
const rewrite = defineRule({
  async check({ files, report }) {
    const content = await files.readText('a.txt')
    if (content?.includes('old') === true) report({ fix: fixer => fixer.text('a.txt', text => text.replaceAll('old', 'new')), messageId: 'old' })
  },
  meta: { fixable: true, id: 'rewrite-old', messages: { old: 'a.txt says old' }, severity: 'warning' },
})
const rules = splitRules([rewrite])
const gh = vi.fn<GhRunner>(() => Promise.resolve({ ok: false, stderr: 'gh: not logged in', stdout: '' }))

/**
 * Create a clone `app` whose a.txt says `old`, with fake git readers that list it
 * @param fields what to change in the clone as the inventory reads it
 * @returns the clone and the readers
 */
async function makeClone(fields: Readonly<Partial<LocalClone>> = {}) {
  const folder = await mkdtemp(path.join(tmpdir(), 'repo-check-fix-projects-'))
  onTestFinished(() => rm(folder, { force: true, recursive: true }))
  await mkdir(path.join(folder, 'app'))
  await writeFile(path.join(folder, 'app', 'a.txt'), 'old a')
  const clone: LocalClone = { branches: [], changedFiles: [], currentBranch: 'master', fetchFailed: false, folderName: 'app', localOnlyBranches: [], origin: 'git@github.com:owner/app.git', path: path.join(folder, 'app'), problem: undefined, slug: 'owner/app', stashes: [], unpushed: [], ...fields }
  const git: GitReaders = { listClones: vi.fn<GitReaders['listClones']>(() => Promise.resolve([clone])), readClone: vi.fn<GitReaders['readClone']>(() => Promise.resolve(clone)) }
  return { clone, git }
}

/**
 * The result of a project, with a finding that has an edit or not
 * @param clone the clone
 * @param hasEdit true when the finding comes with a file edit
 * @returns the result
 */
function resultOf(clone: LocalClone, hasEdit: boolean): ProjectResult {
  const edits = hasEdit ? [{ apply: (text: string) => text, file: 'a.txt' }] : []
  return { findings: [{ actions: [], edits, installs: [], message: 'a.txt says old', messageId: 'old', ruleId: 'rewrite-old', scope: 'file', severity: 'warning' }], outcomes: [], project: { github: undefined, isOtherOwner: false, local: clone, name: 'app' } }
}

describe(fixProjects, () => {
  it('fixes the file of a project that has a fix, even when gh cannot be read', async () => {
    expect.hasAssertions()
    const { clone, git } = await makeClone()
    const lines = await fixProjects([resultOf(clone, true)], { gh, git, rules })
    expect(lines).toStrictEqual(['app: fixed 1 file (a.txt), no fix left, check git diff'])
    await expect(readFile(path.join(clone.path, 'a.txt'), 'utf8')).resolves.toBe('new a')
  })

  it('merges the fix into a file that already has uncommitted changes', async () => {
    expect.hasAssertions()
    const { clone, git } = await makeClone({ changedFiles: [' M a.txt'] })
    await writeFile(path.join(clone.path, 'a.txt'), 'old a, edited by hand')
    const lines = await fixProjects([resultOf(clone, true)], { gh, git, rules })
    expect(lines).toStrictEqual(['app: fixed 1 file (a.txt), no fix left, check git diff'])
    await expect(readFile(path.join(clone.path, 'a.txt'), 'utf8')).resolves.toBe('new a, edited by hand')
  })

  it('leaves alone the projects without a fix or without a usable clone', async () => {
    expect.hasAssertions()
    const { clone, git } = await makeClone()
    const lines = await fixProjects([resultOf(clone, false), resultOf({ ...clone, problem: 'no-origin' }, true), resultOf({ ...clone, slug: undefined }, true)], { gh, git, rules })
    expect(lines).toStrictEqual([])
    await expect(readFile(path.join(clone.path, 'a.txt'), 'utf8')).resolves.toBe('old a')
  })

  it('says why a project was not fixed and goes on', async () => {
    expect.hasAssertions()
    const { clone, git } = await makeClone()
    await writeFile(path.join(clone.path, 'a.txt'), 'already fine')
    const lines = await fixProjects([resultOf(clone, true)], { gh, git, rules })
    expect(lines).toStrictEqual(['app: not fixed, no file of owner/app has a fix to apply'])
  })
})
