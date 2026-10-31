import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { GhRunner } from './inventory/github.ts'
import { run } from './inventory/shell.ts'
import { apiRepo, cli, fakeAccount, makeEmptyFolder } from './cli-fixtures.ts'
import { expandHome } from './cli.ts'

describe(cli, () => {
  it('shows the usage', async () => {
    expect.hasAssertions()
    const { code, output } = await cli(['--help'])
    expect(code).toBe(0)
    expect(output).toContain('Usage: repo-check [ui] [options]')
  })

  it('refuses an unknown option, with the usage', async () => {
    expect.hasAssertions()
    const { code, output } = await cli(['--nope'])
    expect(code).toBe(1)
    expect(output).toMatch(/^repo-check failed: Unknown option '--nope'/u)
    expect(output).toContain('Usage:')
  })

  it('says all is well for a folder without projects, and exits with 0', async () => {
    expect.hasAssertions()
    const folder = await makeEmptyFolder()
    const { code, output, progress } = await cli([], { cwd: folder })
    expect(code).toBe(0)
    expect(output).toMatch(new RegExp(`^repo-check · ${folder} · owner · 0 projects in \\d+\\.\\ds\\n\\n0 checks run, 0 skipped · 0 errors · 0 warnings · 0 info\\n✔ all good$`, 'u'))
    expect(progress).toStrictEqual([`reading the local clones in ${folder}`, 'listing the repos of owner on GitHub', 'reading the CI and the activity of the repos', 'checking 0 projects, each clone is fetched just before its check'])
  })

  it('takes the target and the owner from the options', async () => {
    expect.hasAssertions()
    const folder = await makeEmptyFolder()
    const gh = fakeAccount()
    const { output } = await cli([`--target=${folder}`, '--owner=someone', '--no-fetch'], { gh })
    expect(output).toContain(`repo-check · ${folder} · someone · 0 projects`)
    expect(gh.mock.calls.map(([args]) => args.at(-1))).toContain('users/someone/repos?per_page=100')
  })

  it('checks the forks too, an info finding exits with 0', async () => {
    expect.hasAssertions()
    const { code, output, progress } = await cli([], { cwd: await makeEmptyFolder(), gh: fakeAccount([apiRepo('lib', true)]) })
    expect(code).toBe(0)
    expect(output).toContain('pristine-fork')
    expect(progress).toContain('comparing 1 fork with their parent')
  })

  it('exits with 1 when a finding is an error', async () => {
    expect.hasAssertions()
    const folder = await makeEmptyFolder()
    await run('git', ['init', '--quiet', 'app'], folder)
    await run('git', ['remote', 'add', 'origin', 'git@github.com:owner/app.git'], path.join(folder, 'app'))
    await writeFile(path.join(folder, 'app', 'index.ts'), 'export {}')
    const { code, output } = await cli(['--no-fetch'], { cwd: folder, gh: fakeAccount([apiRepo('app', false)]) })
    expect(code).toBe(1)
    expect(output).toContain('package-json-exists')
    expect(output).not.toContain('passed (')
  })

  it('lists the passed and skipped checks with --verbose', async () => {
    expect.hasAssertions()
    const folder = await makeEmptyFolder()
    await run('git', ['init', '--quiet', 'app'], folder)
    await run('git', ['remote', 'add', 'origin', 'git@github.com:owner/app.git'], path.join(folder, 'app'))
    const { output } = await cli(['--no-fetch', '--verbose'], { cwd: folder, gh: fakeAccount([apiRepo('app', false)]) })
    expect(output).toMatch(/✔ passed \(\d+\)\n {2}app {2}\S/u)
    expect(output).toMatch(/– skipped \(\d+\)\n {2}app {2}/u)
  })

  it('runs one more check with --nitpick', async () => {
    expect.hasAssertions()
    const folder = await makeEmptyFolder()
    await run('git', ['init', '--quiet', 'app'], folder)
    await run('git', ['remote', 'add', 'origin', 'git@github.com:owner/app.git'], path.join(folder, 'app'))
    const quiet = await cli(['--no-fetch', '--verbose'], { cwd: folder, gh: fakeAccount([apiRepo('app', false)]) })
    const nitpicky = await cli(['--no-fetch', '--verbose', '--nitpick'], { cwd: folder, gh: fakeAccount([apiRepo('app', false)]) })
    expect(quiet.output).not.toContain('outdated-minor-dependency')
    expect(nitpicky.output).toContain('outdated-minor-dependency')
  })

  it('refuses a target that is not a folder', async () => {
    expect.hasAssertions()
    const { code, output } = await cli(['--target=/missing/projects'])
    expect(code).toBe(1)
    expect(output).toContain('repo-check failed: the target /missing/projects is not a folder')
  })

  it('reports a gh failure', async () => {
    expect.hasAssertions()
    const gh = vi.fn<GhRunner>(() => Promise.resolve({ ok: false, stderr: 'gh: To get started with GitHub CLI, please run: gh auth login', stdout: '' }))
    const { code, output } = await cli([], { cwd: await makeEmptyFolder(), gh })
    expect(code).toBe(1)
    expect(output).toContain('repo-check failed: gh api user failed: gh: To get started with GitHub CLI, please run: gh auth login')
  })

  it('reports a failure that is not an Error', async () => {
    expect.hasAssertions()
    const gh = vi.fn<GhRunner>(() => Promise.reject(new Error('spawn gh ENOENT').message))
    const { code, output } = await cli([], { cwd: await makeEmptyFolder(), gh })
    expect(code).toBe(1)
    expect(output).toContain('repo-check failed: spawn gh ENOENT')
  })
})

describe('home expansion', () => {
  it.each([
    ['~', '/home/me'],
    ['~/Projects/github', '/home/me/Projects/github'],
    ['~other/x', '~other/x'],
    ['./~/x', './~/x'],
    ['/tmp', '/tmp'],
  ])('%s gives %s', (value, expected) => {
    expect.hasAssertions()
    expect(expandHome(value, '/home/me')).toBe(expected)
  })
})
