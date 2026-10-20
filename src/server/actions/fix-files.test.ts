import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { LocalClone } from '../../shared/project.ts'
import { defineRule } from '../engine/define-rule.ts'
import { splitRules } from '../engine/load-rules.ts'
import type { GhRunner } from '../inventory/github.ts'
import type { GitReaders } from './action-options.ts'
import { fixFiles, previewFixFiles } from './fix-files.ts'

/** Rewrites `old` to `new` in `a.txt` and `b.txt`, and creates `docs/new.md` when it is missing */
const rewrite = defineRule({
  async check({ files, report }) {
    const texts = await Promise.all(['a.txt', 'b.txt', 'docs/new.md'].map(file => files.readText(file)))
    for (const [index, file] of ['a.txt', 'b.txt'].entries()) if (texts[index]?.includes('old') === true) report({ data: { file }, fix: fixer => fixer.text(file, text => text.replaceAll('old', 'new')), messageId: 'old' })
    if (texts[2] === undefined) report({ fix: fixer => fixer.text('docs/new.md', () => '# new\n'), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'rewrite-old', messages: { missing: 'no docs/new.md', old: '{{file}} says old' }, severity: 'warning' },
})
const rules = splitRules([rewrite])

/** Wants a `public.txt`, only a public repo needs it */
const wantPublic = defineRule({
  check({ flags, report }) {
    if (flags.isPrivate !== true) report({ fix: fixer => fixer.text('public.txt', () => 'public\n'), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'want-public', messages: { missing: 'no public.txt' }, severity: 'warning' },
})
const publicRules = splitRules([wantPublic])

/** Reports a fix that never settles, the file says the same after it */
const stubborn = defineRule({
  check({ report }) {
    report({ fix: fixer => fixer.text('stubborn.txt', () => 'same\n'), messageId: 'again' })
  },
  meta: { fixable: true, id: 'stubborn', messages: { again: 'stubborn.txt again' }, severity: 'warning' },
})

/** A project folder with the two files, and fake git readers that list it as the clone of `owner/app` */
interface Workspace {
  /** The clone folder */
  folder: string
  /** The fake readers */
  git: GitReaders
  /** The folder of projects */
  target: string
}

/**
 * Create a folder of projects with a clone `app` whose files say `old`
 * @param fields what to change in the clone as the inventory reads it
 * @param listed the clones the folder lists, the clone by default
 * @returns the workspace
 */
async function makeWorkspace(fields: Readonly<Partial<LocalClone>> = {}, listed?: readonly Partial<LocalClone>[]): Promise<Workspace> {
  const target = await mkdtemp(path.join(tmpdir(), 'repo-check-fix-'))
  onTestFinished(() => rm(target, { force: true, recursive: true }))
  const folder = path.join(target, 'app')
  await mkdir(folder)
  await writeFile(path.join(folder, 'a.txt'), 'old a')
  await writeFile(path.join(folder, 'b.txt'), 'old b')
  const read = (extra: Readonly<Partial<LocalClone>>): LocalClone => ({
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
    ...fields,
    ...extra,
  })
  const git: GitReaders = { listClones: vi.fn<GitReaders['listClones']>(() => Promise.resolve((listed ?? [{}]).map(extra => read(extra)))), readClone: vi.fn<GitReaders['readClone']>(() => Promise.resolve(read({}))) }
  return { folder, git, target }
}

const gh = vi.fn<GhRunner>()

/**
 * The preview of the fixes, read fresh, when it is offered
 * @param workspace the workspace
 * @param workspace.git the fake readers
 * @param workspace.target the folder of projects
 * @returns the preview
 * @throws {Error} when the preview is refused
 */
async function okPreview({ git, target }: Readonly<Workspace>) {
  const preview = await previewFixFiles({ gh, git, name: 'app', owner: 'Owner', rules, target })
  if (!preview.ok) throw new Error(preview.reason)
  return preview
}

/**
 * The fingerprint of the plan, read fresh
 * @param workspace the workspace
 * @returns the fingerprint
 */
async function fingerprintOf(workspace: Readonly<Workspace>) {
  const preview = await okPreview(workspace)
  return preview.fingerprint
}

describe(previewFixFiles, () => {
  it('says what each file becomes, with the new file too, and a fingerprint that holds while nothing changes', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const preview = await okPreview(workspace)
    expect(preview).toMatchObject({ merged: [], path: workspace.folder })
    expect(preview.plans.toSorted((first, second) => first.file.localeCompare(second.file))).toStrictEqual([
      { after: 'new a', before: 'old a', file: 'a.txt' },
      { after: 'new b', before: 'old b', file: 'b.txt' },
      { after: '# new\n', before: '', file: 'docs/new.md' },
    ])
    await expect(fingerprintOf(workspace)).resolves.toBe(preview.fingerprint)
  })

  it('plans every file, and lists the ones with uncommitted changes as merged', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace({ changedFiles: [' M a.txt', '?? other.txt'] })
    const preview = await okPreview(workspace)
    expect(preview.merged).toStrictEqual(['a.txt'])
    expect(preview.plans.map(plan => plan.file).toSorted()).toStrictEqual(['a.txt', 'b.txt', 'docs/new.md'])
  })

  it('understands a renamed file and a quoted path in the git status', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace({ changedFiles: ['R  c.txt -> a.txt', ' M "b.txt"'] })
    const preview = await previewFixFiles({ gh, git: workspace.git, name: 'app', owner: 'Owner', rules, target: workspace.target })
    expect(preview).toMatchObject({ merged: ['a.txt', 'b.txt'], ok: true })
  })

  it('refuses a project with nothing to fix', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    await writeFile(path.join(workspace.folder, 'a.txt'), 'fine')
    await writeFile(path.join(workspace.folder, 'b.txt'), 'fine')
    await mkdir(path.join(workspace.folder, 'docs'))
    await writeFile(path.join(workspace.folder, 'docs', 'new.md'), '# there\n')
    await expect(previewFixFiles({ gh, git: workspace.git, name: 'app', owner: 'Owner', rules, target: workspace.target })).resolves.toStrictEqual({ ok: false, reason: 'no file of Owner/app has a fix to apply' })
  })

  it.each([
    ['another owner', [{ origin: 'git@github.com:someone/app.git', slug: 'someone/app' }]],
    ['a folder that is not a usable clone', [{ problem: 'no-git' as const, slug: undefined }]],
    ['no clone at all', []],
  ])('finds no clone to fix for %s', async (_name, listed) => {
    expect.hasAssertions()
    const workspace = await makeWorkspace({}, listed)
    await expect(previewFixFiles({ gh, git: workspace.git, name: 'app', owner: 'Owner', rules, target: workspace.target })).resolves.toStrictEqual({ ok: false, reason: `no clone of Owner/app that holds files to fix in ${workspace.target}` })
  })

  it('finds a clone whose repo was renamed by its folder name', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace({}, [{ slug: 'owner/renamed' }])
    await expect(previewFixFiles({ gh, git: workspace.git, name: 'app', owner: 'Owner', rules, target: workspace.target })).resolves.toMatchObject({ ok: true })
  })

  it('works in single project mode, where the target is the clone', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    await mkdir(path.join(workspace.folder, '.git'))
    const preview = await previewFixFiles({ gh, git: workspace.git, name: 'app', owner: 'Owner', rules, target: workspace.folder })
    expect(preview).toMatchObject({ ok: true })
    expect(workspace.git.readClone).toHaveBeenCalledWith(workspace.folder, { shouldFetch: false })
  })

  it.each([
    ['an Error', new Error('disk is gone'), 'disk is gone'],
    ['a string', 'disk is gone', 'disk is gone'],
  ])('reports %s thrown while reading', async (_name, thrown, reason) => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    vi.spyOn(workspace.git, 'listClones').mockRejectedValue(thrown)
    await expect(previewFixFiles({ gh, git: workspace.git, name: 'app', owner: 'Owner', rules, target: workspace.target })).resolves.toStrictEqual({ ok: false, reason })
  })
})

describe(fixFiles, () => {
  it('writes every fixable file, creating the new one, and says what is left', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const result = await fixFiles({ fingerprint: await fingerprintOf(workspace), gh, git: workspace.git, name: 'app', owner: 'Owner', rules, target: workspace.target })
    expect(result).toMatchObject({ message: expect.stringContaining('fixed 3 files (a.txt, b.txt, docs/new.md), no fix left, check git diff'), ok: true })
    await expect(readFile(path.join(workspace.folder, 'a.txt'), 'utf8')).resolves.toBe('new a')
    await expect(readFile(path.join(workspace.folder, 'docs', 'new.md'), 'utf8')).resolves.toBe('# new\n')
  })

  it('says how many findings still have a fix after the files are written', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const options = { gh, git: workspace.git, name: 'app', owner: 'Owner', rules: splitRules([stubborn]), target: workspace.target }
    const preview = await previewFixFiles(options)
    const { fingerprint } = preview as { fingerprint: string }
    await expect(fixFiles({ ...options, fingerprint })).resolves.toMatchObject({ message: expect.stringContaining('1 finding left with a fix') as string, ok: true })
  })

  it('merges the fix into a file with uncommitted changes', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace({ changedFiles: [' M a.txt'] })
    const result = await fixFiles({ fingerprint: await fingerprintOf(workspace), gh, git: workspace.git, name: 'app', owner: 'Owner', rules, target: workspace.target })
    expect(result).toMatchObject({ message: expect.stringContaining('fixed 3 files (a.txt, b.txt, docs/new.md), no fix left'), ok: true })
    await expect(readFile(path.join(workspace.folder, 'a.txt'), 'utf8')).resolves.toBe('new a')
  })

  it.each([
    ['empty', ''],
    ['wrong', 'not-the-plan-the-user-saw'],
  ])('refuses and writes nothing when the fingerprint is %s', async (_name, fingerprint) => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const result = await fixFiles({ fingerprint, gh, git: workspace.git, name: 'app', owner: 'Owner', rules, target: workspace.target })
    expect(result).toStrictEqual({ ok: false, reason: 'the fixes are not what the dialog listed any more, nothing was written, open the dialog again' })
    await expect(readFile(path.join(workspace.folder, 'a.txt'), 'utf8')).resolves.toBe('old a')
  })

  it('refuses when a file changed after the dialog listed the plan', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const fingerprint = await fingerprintOf(workspace)
    await writeFile(path.join(workspace.folder, 'a.txt'), 'old a, edited meanwhile')
    const result = await fixFiles({ fingerprint, gh, git: workspace.git, name: 'app', owner: 'Owner', rules, target: workspace.target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('not what the dialog listed any more') })
    await expect(readFile(path.join(workspace.folder, 'a.txt'), 'utf8')).resolves.toBe('old a, edited meanwhile')
  })

  it('has nothing to do the second time', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const fingerprint = await fingerprintOf(workspace)
    await fixFiles({ fingerprint, gh, git: workspace.git, name: 'app', owner: 'Owner', rules, target: workspace.target })
    await expect(fixFiles({ fingerprint, gh, git: workspace.git, name: 'app', owner: 'Owner', rules, target: workspace.target })).resolves.toStrictEqual({ ok: false, reason: 'no file of Owner/app has a fix to apply' })
  })

  it('refuses when every fixable file got uncommitted changes since the dialog', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace({ changedFiles: [' M a.txt', ' M b.txt', '?? docs/new.md'] })
    const result = await fixFiles({ fingerprint: 'x', gh, git: workspace.git, name: 'app', owner: 'Owner', rules, target: workspace.target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('not what the dialog listed any more') })
  })

  it.each([
    ['an Error', new Error('disk is gone'), 'disk is gone'],
    ['a string', 'disk is gone', 'disk is gone'],
  ])('reports %s thrown while reading', async (_name, thrown, reason) => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    vi.spyOn(workspace.git, 'listClones').mockRejectedValue(thrown)
    await expect(fixFiles({ fingerprint: 'x', gh, git: workspace.git, name: 'app', owner: 'Owner', rules, target: workspace.target })).resolves.toStrictEqual({ ok: false, reason })
  })
})

describe('private repo', () => {
  it('plans what a public repo needs only when the GitHub repo is public, and fixes it the same way', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const repo = { archived: false, default_branch: 'master', fork: false, name: 'app', open_issues_count: 0, owner: { login: 'Owner' }, pushed_at: '2026-01-01T00:00:00Z' }
    gh.mockResolvedValue({ ok: true, stderr: '', stdout: JSON.stringify({ ...repo, private: false }) })
    const preview = await previewFixFiles({ gh, git: workspace.git, name: 'app', owner: 'Owner', rules: publicRules, target: workspace.target })
    expect(preview).toMatchObject({ ok: true, plans: [{ file: 'public.txt' }] })
    gh.mockResolvedValue({ ok: true, stderr: '', stdout: JSON.stringify({ ...repo, private: true }) })
    await expect(previewFixFiles({ gh, git: workspace.git, name: 'app', owner: 'Owner', rules: publicRules, target: workspace.target })).resolves.toStrictEqual({ ok: false, reason: 'no file of Owner/app has a fix to apply' })
  })
})
