import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { defineRule } from '../engine/define-rule.ts'
import { splitRules } from '../engine/load-rules.ts'
import type { GhRunner } from '../inventory/github.ts'
import { run } from '../inventory/shell.ts'
import type { GitReaders } from './action-options.ts'
import type { Checker } from './check-script.ts'
import { fixFiles, previewFixFiles } from './fix-files.ts'

/** Rewrites `old` to `new` in `a.txt` */
const rewrite = defineRule({
  async check({ files, report }) {
    const text = await files.readText('a.txt')
    if (text?.includes('old') === true) report({ fix: fixer => fixer.text('a.txt', current => current.replaceAll('old', 'new')), messageId: 'old' })
  },
  meta: { fixable: true, id: 'rewrite-old', messages: { old: 'a.txt says old' }, severity: 'warning' },
})
const rules = splitRules([rewrite])
const gh = vi.fn<GhRunner>()

/**
 * Create a folder of projects with a clone `app` that is a real git repo, with one commit and an uncommitted `c.txt`
 * @returns what an action needs, with the fingerprint of the plan
 */
async function makeRepo() {
  const target = await mkdtemp(path.join(tmpdir(), 'repo-check-commit-'))
  onTestFinished(() => rm(target, { force: true, recursive: true }))
  const folder = path.join(target, 'app')
  await mkdir(folder)
  await writeFile(path.join(folder, 'a.txt'), 'old a')
  await writeFile(path.join(folder, 'c.txt'), 'c')
  await run('git', ['init', '-q'], folder)
  await run('git', ['config', 'user.name', 't'], folder)
  await run('git', ['config', 'user.email', 't@t.t'], folder)
  await run('git', ['config', 'commit.gpgsign', 'false'], folder)
  await run('git', ['add', '.'], folder)
  await run('git', ['commit', '-qm', 'init'], folder)
  const remote = path.join(target, 'remote.git')
  await run('git', ['init', '-q', '--bare', remote])
  await run('git', ['remote', 'add', 'origin', remote], folder)
  await run('git', ['push', '-q', '-u', 'origin', 'HEAD'], folder)
  await writeFile(path.join(folder, 'c.txt'), 'changed')
  const clone: Awaited<ReturnType<GitReaders['readClone']>> = {
    branches: [],
    changedFiles: [' M c.txt'],
    currentBranch: 'master',
    fetchFailed: false,
    folderName: 'app',
    localOnlyBranches: [],
    origin: 'git@github.com:Owner/app.git',
    path: folder,
    problem: undefined,
    slug: 'owner/app',
    stashes: [],
    unpushed: [],
  }
  const git: GitReaders = { readClone: vi.fn<GitReaders['readClone']>(() => Promise.resolve(clone)), readClones: vi.fn<GitReaders['readClones']>(() => Promise.resolve([clone])) }
  const options = { gh, git, name: 'app', owner: 'Owner', rules, target }
  const preview = await previewFixFiles(options)
  if (!preview.ok) throw new Error(preview.reason)
  return { folder, options: { ...options, commit: true, fingerprint: preview.fingerprint } }
}

describe('commit', () => {
  it('commits what it wrote and nothing else when asked', async () => {
    expect.hasAssertions()
    const { folder, options } = await makeRepo()
    const result = await fixFiles(options)
    expect(result).toMatchObject({ message: expect.stringContaining('committed and pushed'), ok: true })
    const log = await run('git', ['log', '--format=%s'], folder)
    expect(log.stdout).toBe('chore: apply the repo-checker fixes\ninit\n')
    const remoteLog = await run('git', ['log', '--format=%s', '@{upstream}'], folder)
    expect(remoteLog.stdout).toBe(log.stdout)
    const status = await run('git', ['status', '--porcelain'], folder)
    expect(status.stdout).toBe(' M c.txt\n')
  })

  it('leaves the changes uncommitted and says why when the check fails', async () => {
    expect.hasAssertions()
    const { folder, options } = await makeRepo()
    const check = vi.fn<Checker>(() => Promise.resolve({ ok: false, stderr: 'lint exploded', stdout: 'running' }))
    const result = await fixFiles({ ...options, check })
    expect(result).toMatchObject({ commitBlocked: 'running\nlint exploded', message: expect.stringContaining('not committed because the check failed'), ok: true })
    const log = await run('git', ['log', '--format=%s'], folder)
    expect(log.stdout).toBe('init\n')
    await expect(readFile(path.join(folder, 'a.txt'), 'utf8')).resolves.toBe('new a')
  })

  it('says each step it enters, the check only when the project has one', async () => {
    expect.hasAssertions()
    const { options } = await makeRepo()
    const stages: string[] = []
    const check = vi.fn<Checker>((_folder, onStart) => {
      onStart()
      return Promise.resolve({ ok: true, stderr: '', stdout: '' })
    })
    await fixFiles({ ...options, check, onStage: stage => stages.push(stage) })
    expect(stages).toStrictEqual(['writing', 'checking', 'committing', 'pushing'])
  })

  it('commits when the check passes', async () => {
    expect.hasAssertions()
    const { folder, options } = await makeRepo()
    const check = vi.fn<Checker>(() => Promise.resolve({ ok: true, stderr: '', stdout: '' }))
    await fixFiles({ ...options, check })
    expect(check).toHaveBeenCalledWith(folder, expect.any(Function))
    const log = await run('git', ['log', '--format=%s'], folder)
    expect(log.stdout).toBe('chore: apply the repo-checker fixes\ninit\n')
  })

  it('does not run the check unless asked to commit', async () => {
    expect.hasAssertions()
    const { options } = await makeRepo()
    const check = vi.fn<Checker>()
    await fixFiles({ ...options, check, commit: false })
    expect(check).not.toHaveBeenCalled()
  })

  it('does not commit unless asked', async () => {
    expect.hasAssertions()
    const { folder, options } = await makeRepo()
    await fixFiles({ ...options, commit: false })
    const log = await run('git', ['log', '--format=%s'], folder)
    expect(log.stdout).toBe('init\n')
  })

  it('says the files were written but not committed when git refuses the commit', async () => {
    expect.hasAssertions()
    const { folder, options } = await makeRepo()
    const hook = path.join(folder, '.git', 'hooks', 'pre-commit')
    await writeFile(hook, '#!/bin/sh\nexit 1\n')
    await chmod(hook, 0o755)
    const result = await fixFiles(options)
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('the files were written but not committed, git commit failed') })
  })

  it('says it is committed but not pushed when the push fails', async () => {
    expect.hasAssertions()
    const { folder, options } = await makeRepo()
    await run('git', ['remote', 'set-url', 'origin', path.join(folder, 'missing.git')], folder)
    const result = await fixFiles(options)
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('the files were written but committed but not pushed, git push failed') })
  })

  it('says the files were written but not committed when git cannot add them', async () => {
    expect.hasAssertions()
    const { folder, options } = await makeRepo()
    await rm(path.join(folder, '.git'), { force: true, recursive: true })
    const result = await fixFiles(options)
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('the files were written but not committed, git add failed') })
  })
})
