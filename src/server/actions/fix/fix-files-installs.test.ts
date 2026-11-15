import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { invariant } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'
import { splitRules } from '../../engine/load-rules.ts'
import { writeArgsRecorder } from '../../test/fake-command-fixtures.ts'
import type { ActionOptions, GitReaders } from '../action-options.ts'
import { fixFiles, previewFixFiles } from './fix-files.ts'
import type { Installer } from './install.ts'

/** Wants a tool: a fix on `a.txt` that installs `knip` */
const wantTool = defineRule({
  async check({ files, report }) {
    const text = await files.readText('a.txt')
    if (text?.includes('old') === true) report({ fix: fixer => fixer.text('a.txt', current => current.replaceAll('old', 'tooled')), installs: ['knip'], messageId: 'missing' })
  },
  meta: { fixable: true, id: 'want-tool', messages: { missing: 'no tool' }, severity: 'warning' },
})
/** Thanks the tool once it is installed: a fix on `b.txt` that only applies when `installed.txt` exists */
const thanksTool = defineRule({
  async check({ files, report }) {
    const installed = await files.readText('installed.txt')
    const text = await files.readText('b.txt')
    if (installed !== undefined && text === undefined) report({ fix: fixer => fixer.text('b.txt', () => 'thanks knip'), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'thanks-tool', messages: { missing: 'no thanks' }, severity: 'warning' },
})
const rules = splitRules([wantTool])
const gh = vi.fn<ActionOptions['gh']>()
const fine = { ok: true, stderr: '', stdout: '' }

/**
 * Create a folder of projects with a clone `app` whose `a.txt` says old
 * @param changedFiles the uncommitted files of the clone
 * @returns what an action needs
 */
async function makeWorkspace(changedFiles: string[] = []) {
  const target = await mkdtemp(path.join(tmpdir(), 'repo-check-installs-'))
  onTestFinished(() => rm(target, { force: true, recursive: true }))
  const folder = path.join(target, 'app')
  await mkdir(folder)
  await writeFile(path.join(folder, 'a.txt'), 'old a')
  const clone: Awaited<ReturnType<GitReaders['readClone']>> = { branches: [], changedFiles, currentBranch: 'master', fetchFailed: false, folderName: 'app', localOnlyBranches: [], origin: 'git@github.com:Owner/app.git', path: folder, problem: undefined, slug: 'owner/app', stashes: [], unpushed: [] }
  const git: GitReaders = { listClones: vi.fn<GitReaders['listClones']>(() => Promise.resolve([clone])), readClone: vi.fn<GitReaders['readClone']>(() => Promise.resolve(clone)) }
  return { folder, options: { gh, git, name: 'app', owner: 'Owner', rules, target } }
}

describe('installs', () => {
  it('lists the dev dependencies in the preview, and installs them after writing the files', async () => {
    expect.hasAssertions()
    const { folder, options } = await makeWorkspace()
    const preview = await previewFixFiles(options)
    expect(preview).toMatchObject({ installs: ['knip'], ok: true })
    invariant(preview.ok, 'the preview is fine')
    const install = vi.fn<Installer>(() => Promise.resolve(fine))
    const stages: string[] = []
    const result = await fixFiles({ ...options, fingerprint: preview.fingerprint, install, onStage: stage => stages.push(stage) })
    expect(stages).toStrictEqual(['writing', 'installing'])
    expect(result).toMatchObject({ message: expect.stringContaining('fixed 1 file (a.txt), installed knip'), ok: true })
    expect(install).toHaveBeenCalledWith(folder, ['knip'])
    await expect(readFile(path.join(folder, 'a.txt'), 'utf8')).resolves.toBe('tooled a')
  })

  it('installs with the package manager of the project when no installer is given', async () => {
    expect.hasAssertions()
    const { folder, options } = await makeWorkspace()
    const bin = path.join(folder, '..', 'bin')
    await mkdir(bin)
    await writeArgsRecorder(bin, 'pnpm', path.join(folder, 'args.txt'))
    const preview = await previewFixFiles(options)
    invariant(preview.ok, 'the preview is fine')
    await expect(fixFiles({ ...options, fingerprint: preview.fingerprint })).resolves.toMatchObject({ ok: true })
    await expect(readFile(path.join(folder, 'args.txt'), 'utf8')).resolves.toBe('add --save-dev --save-prefix=~ knip\n')
  })

  it('says so when the install fails after the files were written', async () => {
    expect.hasAssertions()
    const { folder, options } = await makeWorkspace()
    const preview = await previewFixFiles(options)
    invariant(preview.ok, 'the preview is fine')
    const install = vi.fn<Installer>(() => Promise.resolve({ ok: false, stderr: 'ERR_PNPM_FETCH_404\n', stdout: '' }))
    const result = await fixFiles({ ...options, fingerprint: preview.fingerprint, install })
    expect(result).toStrictEqual({ ok: false, reason: 'the files were written but installing knip failed: ERR_PNPM_FETCH_404' })
    await expect(readFile(path.join(folder, 'a.txt'), 'utf8')).resolves.toBe('tooled a')
  })

  it('fixes again what the install made fixable, like a rule that reads the installed dependency', async () => {
    expect.hasAssertions()
    const { folder, options } = await makeWorkspace()
    const preview = await previewFixFiles({ ...options, rules: splitRules([wantTool, thanksTool]) })
    invariant(preview.ok, 'the preview is fine')
    expect(preview.plans.map(plan => plan.file)).toStrictEqual(['a.txt'])
    const install = vi.fn<Installer>(async () => {
      await writeFile(path.join(folder, 'installed.txt'), 'knip')
      return fine
    })
    const result = await fixFiles({ ...options, fingerprint: preview.fingerprint, install, rules: splitRules([wantTool, thanksTool]) })
    expect(result).toMatchObject({ message: expect.stringContaining('fixed 2 files (a.txt, b.txt), installed knip, no fix left'), ok: true })
    await expect(readFile(path.join(folder, 'b.txt'), 'utf8')).resolves.toBe('thanks knip')
  })

  it('still offers the installs of a fix whose file has uncommitted changes', async () => {
    expect.hasAssertions()
    const { options } = await makeWorkspace([' M a.txt'])
    await expect(previewFixFiles(options)).resolves.toMatchObject({ merged: ['a.txt'], ok: true })
  })

  it('refuses, and installs nothing, when the plan is not the one the dialog listed', async () => {
    expect.hasAssertions()
    const { options } = await makeWorkspace()
    const install = vi.fn<Installer>(() => Promise.resolve(fine))
    await expect(fixFiles({ ...options, fingerprint: 'not-the-plan', install })).resolves.toMatchObject({ ok: false })
    expect(install).not.toHaveBeenCalled()
  })
})

describe('installs without file changes', () => {
  it('still installs the dependency when a previous run wrote the files and its install failed', async () => {
    expect.hasAssertions()
    const alreadyWritten = defineRule({
      check({ report }) {
        report({ fix: fixer => fixer.text('a.txt', current => current), installs: ['knip'], messageId: 'missing' })
      },
      meta: { fixable: true, id: 'already-written', messages: { missing: 'no tool' }, severity: 'warning' },
    })
    const { options } = await makeWorkspace()
    const installOnly = { ...options, rules: splitRules([alreadyWritten]) }
    const preview = await previewFixFiles(installOnly)
    expect(preview).toMatchObject({ installs: ['knip'], ok: true, plans: [] })
    invariant(preview.ok, 'the preview is fine')
    const install = vi.fn<Installer>(() => Promise.resolve(fine))
    const result = await fixFiles({ ...installOnly, fingerprint: preview.fingerprint, install })
    expect(install).toHaveBeenCalledWith(expect.any(String), ['knip'])
    expect(result).toMatchObject({ message: expect.stringContaining('fixed no file, installed knip'), ok: true })
  })
})
