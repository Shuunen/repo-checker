import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { LocalClone } from '../../shared/project.ts'
import type { GhRunner } from '../inventory/github.ts'
import type { GitReaders } from './action-options.ts'
import { previewSyncGithubMetadata, syncGithubMetadata } from './github-metadata.ts'

const apiRepo = (fields: Readonly<Record<string, unknown>> = {}) => ({ archived: false, default_branch: 'master', fork: false, name: 'finga', owner: { login: 'Owner' }, private: false, pushed_at: '2026-01-01T00:00:00Z', ...fields })
const aClone = (folder: string) => ({ branches: [], changedFiles: [], currentBranch: 'master', fetchFailed: false, folderName: 'finga', localOnlyBranches: [], origin: undefined, path: folder, problem: undefined, slug: 'owner/finga', stashes: [], unpushed: [] }) satisfies LocalClone
const readers = (clones: LocalClone[]): GitReaders => ({ listClones: () => Promise.resolve(clones), readClone: () => Promise.resolve(clones[0] as LocalClone) })

/**
 * A GitHub that answers the first read with `before`, accepts or refuses the change, then answers the read back with `after`
 * @param before the repo as GitHub has it
 * @param after the repo once changed, undefined for a 404
 * @param isPatchOk false for a refused change
 * @returns the gh runner
 */
function fakeGh(before: Readonly<Record<string, unknown>> | undefined, after: Readonly<Record<string, unknown>> | undefined = before, isPatchOk = true) {
  const reads = [before, after]
  return vi.fn<GhRunner>(args => {
    if (args.includes('PATCH')) return Promise.resolve(isPatchOk ? { ok: true, stderr: '', stdout: '{}' } : { ok: false, stderr: 'HTTP 403', stdout: '' })
    const repo = reads.shift()
    return Promise.resolve(repo === undefined ? { ok: false, stderr: 'HTTP 404: Not Found', stdout: '' } : { ok: true, stderr: '', stdout: JSON.stringify(repo) })
  })
}

/**
 * Create a folder of projects with a clone whose package.json says the given text
 * @param pkg the package.json text, none when left out
 * @param config the .repo-checker.json text, none when left out
 * @returns the folder of projects and the clone
 */
async function makeWorkspace(pkg?: string, config?: string) {
  const target = await mkdtemp(path.join(tmpdir(), 'repo-check-meta-'))
  onTestFinished(() => rm(target, { force: true, recursive: true }))
  const folder = path.join(target, 'finga')
  await mkdir(folder)
  if (pkg !== undefined) await writeFile(path.join(folder, 'package.json'), pkg)
  if (config !== undefined) await writeFile(path.join(folder, '.repo-checker.json'), config)
  return { clone: aClone(folder), target }
}

/** A package.json whose homepage is the source code, the repo, like the check wants */
const pkgText = JSON.stringify({ description: 'A flood game', homepage: 'https://github.com/Owner/finga' })
const configText = JSON.stringify({ webUrl: 'https://finga.app' })

const both = { description: 'A flood game', homepage: 'https://finga.app' }
const none = { description: '', homepage: '' }

describe(previewSyncGithubMetadata, () => {
  it('proposes the website of the project when GitHub has none, and keeps what it has', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText, configText)
    const result = await previewSyncGithubMetadata({ gh: fakeGh(apiRepo({ description: 'Mine' })), git: readers([clone]), name: 'finga', owner: 'Owner', target })
    expect(result).toStrictEqual({ github: { description: 'Mine', homepage: '' }, local: both, ok: true, proposed: { description: 'Mine', homepage: 'https://finga.app' } })
  })

  it('never reads the homepage of the package.json, it is the repo and not the website', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(JSON.stringify({ homepage: 'https://github.com/Owner/finga' }))
    const result = await previewSyncGithubMetadata({ gh: fakeGh(apiRepo()), git: readers([clone]), name: 'finga', owner: 'Owner', target })
    expect(result).toMatchObject({ local: { description: '', homepage: '' }, ok: true, proposed: { homepage: '' } })
  })

  it('keeps the homepage GitHub has', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText, configText)
    const result = await previewSyncGithubMetadata({ gh: fakeGh(apiRepo({ homepage: 'https://mine.app' })), git: readers([clone]), name: 'finga', owner: 'Owner', target })
    expect(result).toMatchObject({ github: { homepage: 'https://mine.app' }, local: { homepage: 'https://finga.app' }, ok: true, proposed: { homepage: 'https://mine.app' } })
  })

  it('shows empty text for what the project does not say', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(JSON.stringify({ description: 'A game' }))
    const result = await previewSyncGithubMetadata({ gh: fakeGh(apiRepo()), git: readers([clone]), name: 'finga', owner: 'Owner', target })
    expect(result).toMatchObject({ local: { description: 'A game', homepage: '' }, ok: true })
  })

  it('refuses when the proof fails', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText)
    const result = await previewSyncGithubMetadata({ gh: fakeGh(undefined), git: readers([clone]), name: 'finga', owner: 'Owner', target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('does not exist on GitHub any more') })
  })

  it.each([
    ['an Error', new Error('gh is gone'), 'gh is gone'],
    ['a string', 'gh is gone', 'gh is gone'],
  ])('reports %s thrown', async (_name, thrown, reason) => {
    expect.hasAssertions()
    const { target } = await makeWorkspace(pkgText)
    const result = await previewSyncGithubMetadata({ gh: () => Promise.reject(thrown as Error), git: readers([]), name: 'finga', owner: 'Owner', target })
    expect(result).toStrictEqual({ ok: false, reason })
  })
})

describe(syncGithubMetadata, () => {
  it('sets the description and the homepage the user confirmed, and reads them back', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText, configText)
    const gh = fakeGh(apiRepo(), apiRepo(both))
    const result = await syncGithubMetadata({ gh, git: readers([clone]), name: 'finga', owner: 'Owner', target }, { description: ' A flood game ', homepage: 'https://finga.app' })
    expect(result).toStrictEqual({ message: 'set the description and homepage of Owner/finga on GitHub', ok: true })
    expect(gh).toHaveBeenCalledWith(['api', '--method', 'PATCH', 'repos/Owner/finga', '-f', 'description=A flood game', '-f', 'homepage=https://finga.app'])
  })

  it('writes the description in the package.json and the homepage as webUrl, and never touches the homepage of the package.json', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace('{\n  "name": "finga",\n  "description": "Old",\n  "homepage": "https://github.com/Owner/finga"\n}\n', '{\n  "maxSizeKo": 80\n}\n')
    const result = await syncGithubMetadata({ gh: fakeGh(apiRepo(), apiRepo(both)), git: readers([clone]), name: 'finga', owner: 'Owner', target }, both)
    const pkg = await readFile(path.join(clone.path, 'package.json'), 'utf8')
    const config = await readFile(path.join(clone.path, '.repo-checker.json'), 'utf8')
    expect(result).toStrictEqual({ message: 'set the description and homepage of Owner/finga on GitHub, updated the description in package.json, updated the webUrl in .repo-checker.json', ok: true })
    expect(JSON.parse(pkg)).toStrictEqual({ description: 'A flood game', homepage: 'https://github.com/Owner/finga', name: 'finga' })
    expect(JSON.parse(config)).toStrictEqual({ maxSizeKo: 80, webUrl: 'https://finga.app' })
  })

  it('keeps the keys of the package.json sorted once the description is added', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace('{\n  "name": "finga",\n  "version": "1.0.0"\n}\n')
    await syncGithubMetadata({ gh: fakeGh(apiRepo(), apiRepo(both)), git: readers([clone]), name: 'finga', owner: 'Owner', target }, both)
    const pkg = await readFile(path.join(clone.path, 'package.json'), 'utf8')
    expect(Object.keys(JSON.parse(pkg) as object)).toStrictEqual(['description', 'name', 'version'])
  })

  it('creates the config when the project has none', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText)
    await syncGithubMetadata({ gh: fakeGh(apiRepo(), apiRepo(both)), git: readers([clone]), name: 'finga', owner: 'Owner', target }, both)
    const config = await readFile(path.join(clone.path, '.repo-checker.json'), 'utf8')
    expect(JSON.parse(config)).toStrictEqual({ webUrl: 'https://finga.app' })
  })

  it('sets on GitHub only what differs from it', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText, configText)
    const gh = fakeGh(apiRepo({ homepage: 'https://mine.app' }), apiRepo({ description: 'A flood game', homepage: 'https://mine.app' }))
    const result = await syncGithubMetadata({ gh, git: readers([clone]), name: 'finga', owner: 'Owner', target }, { description: 'A flood game', homepage: 'https://mine.app' })
    expect(result).toStrictEqual({ message: 'set the description of Owner/finga on GitHub, updated the webUrl in .repo-checker.json', ok: true })
  })

  it('clears a field on GitHub and in the project', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText, configText)
    const gh = fakeGh(apiRepo(both), apiRepo())
    const result = await syncGithubMetadata({ gh, git: readers([clone]), name: 'finga', owner: 'Owner', target }, none)
    const pkg = await readFile(path.join(clone.path, 'package.json'), 'utf8')
    const config = await readFile(path.join(clone.path, '.repo-checker.json'), 'utf8')
    expect(result).toStrictEqual({ message: 'set the description and homepage of Owner/finga on GitHub, updated the description in package.json, updated the webUrl in .repo-checker.json', ok: true })
    expect(JSON.parse(pkg)).toStrictEqual({ homepage: 'https://github.com/Owner/finga' })
    expect(JSON.parse(config)).toStrictEqual({})
  })

  it('only writes the project when GitHub already has everything', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText)
    const gh = fakeGh(apiRepo(both))
    const result = await syncGithubMetadata({ gh, git: readers([clone]), name: 'finga', owner: 'Owner', target }, both)
    expect(result).toStrictEqual({ message: 'updated the webUrl in .repo-checker.json', ok: true })
    expect(gh).toHaveBeenCalledOnce()
  })

  it('does not write the project when it already says it', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText, configText)
    const result = await syncGithubMetadata({ gh: fakeGh(apiRepo(both)), git: readers([clone]), name: 'finga', owner: 'Owner', target }, both)
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('nothing to set') })
    await expect(readFile(path.join(clone.path, '.repo-checker.json'), 'utf8')).resolves.toBe(configText)
  })

  it.each(['not an address', 'ftp://finga.app'])('refuses the homepage %s', async homepage => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText)
    const gh = fakeGh(apiRepo())
    const result = await syncGithubMetadata({ gh, git: readers([clone]), name: 'finga', owner: 'Owner', target }, { description: 'A game', homepage })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('is not an http or https address') })
    expect(gh).toHaveBeenCalledOnce()
  })

  it('says so when GitHub said ok but nothing changed', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText)
    const result = await syncGithubMetadata({ gh: fakeGh(apiRepo()), git: readers([clone]), name: 'finga', owner: 'Owner', target }, both)
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('did not change') })
  })

  it('says so when GitHub only changed one of the two', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText)
    const result = await syncGithubMetadata({ gh: fakeGh(apiRepo(), apiRepo({ description: 'A flood game' })), git: readers([clone]), name: 'finga', owner: 'Owner', target }, both)
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('did not change') })
  })

  it('reports a change GitHub refuses', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText)
    const result = await syncGithubMetadata({ gh: fakeGh(apiRepo(), apiRepo(), false), git: readers([clone]), name: 'finga', owner: 'Owner', target }, both)
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('GitHub refused to change Owner/finga: HTTP 403') })
  })

  it.each([
    { clones: 1, name: 'finga', pkg: pkgText, reason: 'does not exist on GitHub any more', repo: undefined, title: 'a repo gone from GitHub' },
    { clones: 1, name: 'finga', pkg: pkgText, reason: 'is archived now', repo: apiRepo({ archived: true }), title: 'an archived repo' },
    { clones: 0, name: 'finga', pkg: pkgText, reason: 'no clone of', repo: apiRepo(), title: 'no clone' },
    { clones: 2, name: 'finga', pkg: pkgText, reason: '2 clones of', repo: apiRepo(), title: 'two clones' },
    { clones: 1, name: 'finga', pkg: undefined, reason: 'has no package.json', repo: apiRepo(), title: 'a clone without package.json' },
  ])('refuses $title', async ({ clones, name, pkg, reason, repo }) => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkg)
    const gh = fakeGh(repo)
    const result = await syncGithubMetadata({ gh, git: readers(Array.from({ length: clones }, () => clone)), name, owner: 'Owner', target }, both)
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining(reason) })
    expect(gh).not.toHaveBeenCalledWith(expect.arrayContaining(['PATCH']))
  })

  it('refuses when the target is a single project', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText)
    await mkdir(path.join(target, '.git'))
    const result = await syncGithubMetadata({ gh: fakeGh(apiRepo()), git: readers([clone]), name: 'finga', owner: 'Owner', target }, both)
    expect(result.ok).toBe(false)
  })

  it.each([
    ['an Error', new Error('gh is gone'), 'gh is gone'],
    ['a string', 'gh is gone', 'gh is gone'],
  ])('reports %s thrown', async (_name, thrown, reason) => {
    expect.hasAssertions()
    const { target } = await makeWorkspace(pkgText)
    const result = await syncGithubMetadata({ gh: () => Promise.reject(thrown as Error), git: readers([]), name: 'finga', owner: 'Owner', target }, both)
    expect(result).toStrictEqual({ ok: false, reason })
  })
})
