import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { LocalClone } from '../../shared/project.ts'
import type { GhRunner } from '../inventory/github.ts'
import type { GitReaders } from './action-options.ts'
import { syncGithubMetadata } from './github-metadata.ts'

const apiRepo = (fields: Readonly<Record<string, unknown>> = {}) => ({ archived: false, default_branch: 'master', fork: false, name: 'finga', owner: { login: 'Owner' }, private: false, pushed_at: '2026-01-01T00:00:00Z', ...fields })
const aClone = (folder: string) => ({ branches: [], changedFiles: [], currentBranch: 'master', fetchFailed: false, folderName: 'finga', localOnlyBranches: [], origin: undefined, path: folder, problem: undefined, slug: 'owner/finga', stashes: [], unpushed: [] }) satisfies LocalClone
const readers = (clones: LocalClone[]): GitReaders => ({ readClone: () => Promise.resolve(clones[0] as LocalClone), readClones: () => Promise.resolve(clones) })

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
 * @returns the folder of projects and the clone
 */
async function makeWorkspace(pkg?: string) {
  const target = await mkdtemp(path.join(tmpdir(), 'repo-check-meta-'))
  onTestFinished(() => rm(target, { force: true, recursive: true }))
  const folder = path.join(target, 'finga')
  await mkdir(folder)
  if (pkg !== undefined) await writeFile(path.join(folder, 'package.json'), pkg)
  return { clone: aClone(folder), target }
}

const pkgText = JSON.stringify({ description: 'A flood game', homepage: 'https://finga.app' })

describe(syncGithubMetadata, () => {
  it('copies the description and the homepage GitHub has none for, and reads them back', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText)
    const gh = fakeGh(apiRepo(), apiRepo({ description: 'A flood game', homepage: 'https://finga.app' }))
    const result = await syncGithubMetadata({ gh, git: readers([clone]), name: 'finga', owner: 'Owner', target })
    expect(result).toStrictEqual({ message: 'set the description and homepage of Owner/finga on GitHub', ok: true })
    expect(gh).toHaveBeenCalledWith(['api', '--method', 'PATCH', 'repos/Owner/finga', '-f', 'description=A flood game', '-f', 'homepage=https://finga.app'])
  })

  it('never replaces what GitHub already has, and skips a homepage that only points to GitHub', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(JSON.stringify({ description: 'New', homepage: 'https://github.com/Owner/finga#readme' }))
    const gh = fakeGh(apiRepo({ description: 'Mine' }))
    const result = await syncGithubMetadata({ gh, git: readers([clone]), name: 'finga', owner: 'Owner', target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('nothing to copy') })
    expect(gh).toHaveBeenCalledOnce()
  })

  it('copies only the description when the package.json has no homepage', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(JSON.stringify({ description: ' A game ', homepage: 42 }))
    const gh = fakeGh(apiRepo(), apiRepo({ description: 'A game' }))
    const result = await syncGithubMetadata({ gh, git: readers([clone]), name: 'finga', owner: 'Owner', target })
    expect(result).toStrictEqual({ message: 'set the description of Owner/finga on GitHub', ok: true })
  })

  it('keeps the homepage GitHub already has', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText)
    const gh = fakeGh(apiRepo({ homepage: 'https://mine.app' }), apiRepo({ description: 'A flood game', homepage: 'https://mine.app' }))
    const result = await syncGithubMetadata({ gh, git: readers([clone]), name: 'finga', owner: 'Owner', target })
    expect(result).toStrictEqual({ message: 'set the description of Owner/finga on GitHub', ok: true })
  })

  it('ignores a blank homepage', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(JSON.stringify({ description: 'A game', homepage: '  ' }))
    const gh = fakeGh(apiRepo(), apiRepo({ description: 'A game' }))
    const result = await syncGithubMetadata({ gh, git: readers([clone]), name: 'finga', owner: 'Owner', target })
    expect(result).toStrictEqual({ message: 'set the description of Owner/finga on GitHub', ok: true })
  })

  it('says so when GitHub said ok but nothing changed', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText)
    const result = await syncGithubMetadata({ gh: fakeGh(apiRepo()), git: readers([clone]), name: 'finga', owner: 'Owner', target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('did not change') })
  })

  it('says so when GitHub only changed one of the two', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText)
    const result = await syncGithubMetadata({ gh: fakeGh(apiRepo(), apiRepo({ description: 'A flood game' })), git: readers([clone]), name: 'finga', owner: 'Owner', target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('did not change') })
  })

  it('reports a change GitHub refuses', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText)
    const result = await syncGithubMetadata({ gh: fakeGh(apiRepo(), apiRepo(), false), git: readers([clone]), name: 'finga', owner: 'Owner', target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('GitHub refused to change Owner/finga: HTTP 403') })
  })

  it.each([
    { clones: 1, name: '../finga', pkg: pkgText, reason: 'is not a repo name', repo: apiRepo(), title: 'a name that is not a repo name' },
    { clones: 1, name: 'finga', pkg: pkgText, reason: 'does not exist on GitHub any more', repo: undefined, title: 'a repo gone from GitHub' },
    { clones: 1, name: 'finga', pkg: pkgText, reason: 'is archived now', repo: apiRepo({ archived: true }), title: 'an archived repo' },
    { clones: 0, name: 'finga', pkg: pkgText, reason: 'found 0', repo: apiRepo(), title: 'no clone' },
    { clones: 2, name: 'finga', pkg: pkgText, reason: 'found 2', repo: apiRepo(), title: 'two clones' },
    { clones: 1, name: 'finga', pkg: undefined, reason: 'has no package.json', repo: apiRepo(), title: 'a clone without package.json' },
  ])('refuses $title', async ({ clones, name, pkg, reason, repo }) => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkg)
    const gh = fakeGh(repo)
    const result = await syncGithubMetadata({ gh, git: readers(Array.from({ length: clones }, () => clone)), name, owner: 'Owner', target })
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining(reason) })
    expect(gh).not.toHaveBeenCalledWith(expect.arrayContaining(['PATCH']))
  })

  it('refuses when the target is a single project', async () => {
    expect.hasAssertions()
    const { clone, target } = await makeWorkspace(pkgText)
    await mkdir(path.join(target, '.git'))
    const result = await syncGithubMetadata({ gh: fakeGh(apiRepo()), git: readers([clone]), name: 'finga', owner: 'Owner', target })
    expect(result.ok).toBe(false)
  })

  it.each([
    ['an Error', new Error('gh is gone'), 'gh is gone'],
    ['a string', 'gh is gone', 'gh is gone'],
  ])('reports %s thrown', async (_name, thrown, reason) => {
    expect.hasAssertions()
    const { target } = await makeWorkspace(pkgText)
    const result = await syncGithubMetadata({ gh: () => Promise.reject(thrown as Error), git: readers([]), name: 'finga', owner: 'Owner', target })
    expect(result).toStrictEqual({ ok: false, reason })
  })
})
