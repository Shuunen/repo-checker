import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { invariant } from 'es-toolkit'
import { githubSlug, readClone, readClones } from './git.ts'
import { run } from './shell.ts'

const identity = ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false']
const fetch = { shouldFetch: true }

/**
 * Run git in a fixture folder, failing the test when git fails
 * @param folder the folder
 * @param args the git arguments
 * @returns the output
 */
async function git(folder: string, ...args: readonly string[]) {
  const result = await run('git', [...identity, ...args], folder)
  invariant(result.ok, `git ${args.join(' ')} failed: ${result.stderr}`)
  return result.stdout
}

/**
 * Create a workspace with a bare origin, a seed clone that pushed one commit, and a fresh clone named app, removed when the test ends
 * @returns the workspace, seed and app paths
 */
async function makeWorkspace() {
  const workspace = await mkdtemp(path.join(tmpdir(), 'repo-check-git-'))
  onTestFinished(() => rm(workspace, { force: true, recursive: true }))
  await git(workspace, 'init', '--quiet', '--bare', '--initial-branch=main', 'origin.git')
  await git(workspace, 'clone', '--quiet', 'origin.git', 'seed')
  const seed = path.join(workspace, 'seed')
  await writeFile(path.join(seed, 'README.md'), '# app\n')
  await git(seed, 'add', '.')
  await git(seed, 'commit', '--quiet', '-m', 'init')
  await git(seed, 'push', '--quiet', 'origin', 'main')
  await git(workspace, 'clone', '--quiet', 'origin.git', 'app')
  return { app: path.join(workspace, 'app'), seed, workspace }
}

describe('git inventory', () => {
  it('reads a clean clone', async () => {
    expect.hasAssertions()
    const { app, workspace } = await makeWorkspace()
    const clone = await readClone(app, fetch)
    expect(clone).toMatchObject({ changedFiles: [], currentBranch: 'main', fetchFailed: false, folderName: 'app', localOnlyBranches: [], origin: path.join(workspace, 'origin.git'), problem: undefined, slug: undefined, stashes: [], unpushed: [] })
    expect(clone.branches).toStrictEqual([{ ahead: 0, behind: 0, isGone: false, isMerged: true, lastCommitAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/u) as string, name: 'main', upstream: 'origin/main' }])
  })

  it('tells which branches are merged and how old their last commit is, locally and on the remote', async () => {
    expect.hasAssertions()
    const { app, seed } = await makeWorkspace()
    await git(app, 'switch', '--quiet', '-c', 'done')
    await git(app, 'push', '--quiet', '-u', 'origin', 'done')
    await git(app, 'switch', '--quiet', '-c', 'open')
    await git(app, 'commit', '--quiet', '--allow-empty', '-m', 'wip')
    await git(app, 'push', '--quiet', '-u', 'origin', 'open')
    await git(seed, 'commit', '--quiet', '--allow-empty', '-m', 'more')
    const clone = await readClone(app, fetch)
    expect(clone.branches.map(branch => [branch.name, branch.isMerged])).toStrictEqual([
      ['done', true],
      ['main', true],
      ['open', false],
    ])
    expect(clone.remoteBranches?.map(branch => [branch.name, branch.isMerged])).toStrictEqual([
      ['done', true],
      ['main', true],
      ['open', false],
    ])
    expect(clone.remoteBranches?.[0]?.lastCommitAt).toMatch(/^\d{4}-\d{2}-\d{2}T/u)
  })

  it('reads the last tag and the commits since', async () => {
    expect.hasAssertions()
    const { app, seed } = await makeWorkspace()
    await expect(readClone(app, fetch)).resolves.toMatchObject({ lastTag: undefined })
    await git(seed, 'tag', 'v1.0.0')
    await git(seed, 'push', '--quiet', 'origin', 'v1.0.0')
    await git(app, 'fetch', '--quiet', '--tags')
    await git(app, 'commit', '--quiet', '--allow-empty', '-m', 'after the tag')
    const clone = await readClone(app, fetch)
    expect(clone.lastTag).toStrictEqual({ at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/u) as string, commitsSince: 1, name: 'v1.0.0' })
  })

  it('lists uncommitted and untracked files', async () => {
    expect.hasAssertions()
    const { app } = await makeWorkspace()
    await writeFile(path.join(app, 'notes.txt'), 'todo')
    await writeFile(path.join(app, 'README.md'), '# changed\n')
    await expect(readClone(app, fetch)).resolves.toMatchObject({ changedFiles: [' M README.md', '?? notes.txt'] })
  })

  it('lists unpushed commits', async () => {
    expect.hasAssertions()
    const { app } = await makeWorkspace()
    await git(app, 'commit', '--quiet', '--allow-empty', '-m', 'local work')
    const clone = await readClone(app, fetch)
    expect(clone.branches[0]?.ahead).toBe(1)
    expect(clone.unpushed).toStrictEqual([{ branch: 'main', subjects: ['local work'] }])
  })

  it('sees remote commits only after a fetch', async () => {
    expect.hasAssertions()
    const { app, seed } = await makeWorkspace()
    await git(seed, 'commit', '--quiet', '--allow-empty', '-m', 'remote work')
    await git(seed, 'push', '--quiet', 'origin', 'main')
    const before = await readClone(app, { shouldFetch: false })
    expect(before.branches[0]?.behind).toBe(0)
    const after = await readClone(app, fetch)
    expect(after.branches[0]?.behind).toBe(1)
  })

  it('lists the stash', async () => {
    expect.hasAssertions()
    const { app } = await makeWorkspace()
    await writeFile(path.join(app, 'README.md'), '# wip\n')
    await git(app, 'stash', '--quiet')
    const head = await git(app, 'rev-parse', '--short', 'HEAD')
    await expect(readClone(app, fetch)).resolves.toMatchObject({ changedFiles: [], stashes: [`stash@{0}: WIP on main: ${head.trim()} init`] })
  })

  it('lists branches without upstream and branches whose upstream was deleted', async () => {
    expect.hasAssertions()
    const { app, seed } = await makeWorkspace()
    await git(app, 'switch', '--quiet', '-c', 'gone')
    await git(app, 'push', '--quiet', '-u', 'origin', 'gone')
    await git(seed, 'push', '--quiet', 'origin', '--delete', 'gone')
    await git(app, 'switch', '--quiet', '-c', 'local')
    const clone = await readClone(app, fetch)
    expect(clone.currentBranch).toBe('local')
    expect(clone.localOnlyBranches).toStrictEqual(['gone', 'local'])
    expect(clone.branches.find(branch => branch.name === 'gone')?.isGone).toBe(true)
  })

  it('flags a failed fetch', async () => {
    expect.hasAssertions()
    const { app, workspace } = await makeWorkspace()
    await git(app, 'remote', 'set-url', 'origin', path.join(workspace, 'missing.git'))
    await expect(readClone(app, fetch)).resolves.toMatchObject({ fetchFailed: true, problem: undefined })
  })

  it('flags a folder that is not a git repo, and a repo without origin', async () => {
    expect.hasAssertions()
    const { workspace } = await makeWorkspace()
    await mkdir(path.join(workspace, 'plain'))
    await git(workspace, 'init', '--quiet', 'no-origin')
    await expect(readClone(path.join(workspace, 'plain'), fetch)).resolves.toMatchObject({ folderName: 'plain', problem: 'no-git' })
    await expect(readClone(path.join(workspace, 'no-origin'), fetch)).resolves.toMatchObject({ problem: 'no-origin' })
  })

  it('reads every visible sub folder in folder mode, and the target alone in single project mode', async () => {
    expect.hasAssertions()
    const { app, workspace } = await makeWorkspace()
    await mkdir(path.join(workspace, '.hidden'))
    await writeFile(path.join(workspace, 'file.txt'), 'not a folder')
    const clones = await readClones(workspace, { shouldFetch: false })
    expect(clones.map(clone => [clone.folderName, clone.problem])).toStrictEqual([
      ['app', undefined],
      ['origin.git', 'no-git'],
      ['seed', undefined],
    ])
    await expect(readClones(app, { shouldFetch: false })).resolves.toMatchObject([{ folderName: 'app' }])
  })
})

describe('github slug', () => {
  it.each([
    ['git@github.com:Shuunen/repo-checker.git', 'shuunen/repo-checker'],
    ['https://github.com/Shuunen/repo-checker', 'shuunen/repo-checker'],
    ['https://github.com/Shuunen/my.repo.git/', 'shuunen/my.repo'],
    ['ssh://git@github.com/Shuunen/x.git', 'shuunen/x'],
    ['https://gitlab.com/Shuunen/x.git', undefined],
    ['/tmp/origin.git', undefined],
  ])('%s gives %s', (url, slug) => {
    expect.hasAssertions()
    expect(githubSlug(url)).toBe(slug)
  })
})
