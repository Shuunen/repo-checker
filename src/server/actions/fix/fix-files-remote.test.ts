import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { invariant } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'
import { splitRules } from '../../engine/load-rules.ts'
import type { GhRunner } from '../../inventory/github.ts'
import type { GitReaders } from '../action-options.ts'
import { fixFiles, previewFixFiles } from './fix-files.ts'

/**
 * A repo as the GitHub API says it
 * @param description the description it has now
 * @param fields what else the API says of it
 * @returns the API repo
 */
function apiRepo(description: string | undefined, fields: Readonly<Record<string, unknown>> = {}) {
  return { archived: false, default_branch: 'master', description, fork: false, name: 'app', open_issues_count: 0, owner: { login: 'Owner' }, private: false, pushed_at: '2026-01-01T00:00:00Z', ...fields }
}

/**
 * A gh that holds one repo: a PATCH sets its description, unless it is told to refuse
 * @param description the description the repo has at first
 * @param options how the repo behaves
 * @param options.fields what else the API says of the repo
 * @param options.isRefusing true to refuse every PATCH
 * @returns the runner
 */
function fakeGh(description: string | undefined, { fields = {}, isRefusing = false }: Readonly<{ fields?: Record<string, unknown>; isRefusing?: boolean }> = {}) {
  let current = description
  return vi.fn<GhRunner>(args => {
    if (args.includes('PATCH')) {
      if (isRefusing) return Promise.resolve({ ok: false, stderr: 'forbidden', stdout: '' })
      current = String(args.at(-1)).replace('description=', '')
    }
    return Promise.resolve({ ok: true, stderr: '', stdout: JSON.stringify(apiRepo(current, fields)) })
  })
}

/**
 * Create a folder of projects with a clone `app` whose package.json has the given text
 * @param packageJson the package.json, none when left out
 * @returns what an action needs
 */
async function makeWorkspace(packageJson: string | undefined) {
  const target = await mkdtemp(path.join(tmpdir(), 'repo-check-remote-'))
  onTestFinished(() => rm(target, { force: true, recursive: true }))
  const folder = path.join(target, 'app')
  await mkdir(folder)
  if (packageJson !== undefined) await writeFile(path.join(folder, 'package.json'), packageJson)
  const clone: Awaited<ReturnType<GitReaders['readClone']>> = {
    branches: [],
    changedFiles: [],
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
  const git: GitReaders = { listClones: vi.fn<GitReaders['listClones']>(() => Promise.resolve([clone])), readClone: vi.fn<GitReaders['readClone']>(() => Promise.resolve(clone)) }
  return { git, rules: splitRules([]), target }
}

/** Rewrites the package.json to say `From the plan`, a fix that changes the description the repo gets */
const rewritePackage = defineRule({
  check({ report }) {
    report({ fix: fixer => fixer.text('package.json', () => '{ "description": "From the plan" }'), messageId: 'again' })
  },
  meta: { fixable: true, id: 'rewrite-package', messages: { again: 'package.json again' }, severity: 'warning' },
})

const described = '{ "description": "  A game  " }'

describe('the description set on GitHub by the file fixes', () => {
  it('plans it when the repo has none and the package.json has one, and sets it on apply', async () => {
    expect.hasAssertions()
    const gh = fakeGh(undefined)
    const workspace = await makeWorkspace(described)
    const options = { gh, name: 'app', owner: 'Owner', withRemote: true, ...workspace }
    const preview = await previewFixFiles(options)
    invariant(preview.ok, 'the preview is fine')
    expect(preview).toMatchObject({ plans: [], remote: { description: 'A game' } })
    const result = await fixFiles({ ...options, fingerprint: preview.fingerprint })
    expect(result).toMatchObject({ message: expect.stringContaining('set the description on GitHub') as string, ok: true })
    expect(gh).toHaveBeenCalledWith(['api', '--method', 'PATCH', 'repos/Owner/app', '-f', 'description=A game'])
  })

  it('takes the description from the package.json the fixes write', async () => {
    expect.hasAssertions()
    const options = { gh: fakeGh(undefined), name: 'app', owner: 'Owner', withRemote: true, ...(await makeWorkspace(described)), rules: splitRules([rewritePackage]) }
    await expect(previewFixFiles(options)).resolves.toMatchObject({ ok: true, remote: { description: 'From the plan' } })
  })

  it('plans it for its own rule only', async () => {
    expect.hasAssertions()
    const options = { gh: fakeGh(undefined), name: 'app', owner: 'Owner', withRemote: true, ...(await makeWorkspace(described)) }
    await expect(previewFixFiles({ ...options, rule: 'missing-description' })).resolves.toMatchObject({ ok: true, remote: { description: 'A game' } })
    await expect(previewFixFiles({ ...options, rule: 'other-rule' })).resolves.toMatchObject({ ok: false })
  })

  it('never plans it when the page does not ask, the command line does not write to GitHub', async () => {
    expect.hasAssertions()
    const options = { gh: fakeGh(undefined), name: 'app', owner: 'Owner', ...(await makeWorkspace(described)) }
    await expect(previewFixFiles(options)).resolves.toMatchObject({ ok: false })
  })

  it.each([
    ['GitHub has one already', fakeGh('Set on GitHub'), described],
    ['the repo is archived', fakeGh(undefined, { fields: { archived: true } }), described],
    ['the repo is a fork', fakeGh(undefined, { fields: { fork: true } }), described],
    ['GitHub could not say', vi.fn<GhRunner>(() => Promise.reject(new Error('offline'))), described],
    ['the package.json has none', fakeGh(undefined), '{ "name": "app" }'],
    ['the description is blank', fakeGh(undefined), '{ "description": "   " }'],
    ['there is no package.json', fakeGh(undefined), undefined],
  ])('plans nothing when %s', async (_name, gh, packageJson) => {
    expect.hasAssertions()
    const options = { gh, name: 'app', owner: 'Owner', withRemote: true, ...(await makeWorkspace(packageJson)) }
    await expect(previewFixFiles(options)).resolves.toMatchObject({ ok: false })
  })

  it('tells that the files were written when GitHub refuses', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace(described)
    const options = { gh: fakeGh(undefined, { isRefusing: true }), name: 'app', owner: 'Owner', withRemote: true, ...workspace }
    const preview = await previewFixFiles(options)
    invariant(preview.ok, 'the preview is fine')
    await expect(fixFiles({ ...options, fingerprint: preview.fingerprint })).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('the files were written but GitHub refused to change Owner/app') as string })
  })
})
