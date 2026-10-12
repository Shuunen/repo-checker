import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { type CliEnvironment, runCli } from './cli.ts'
import type { GhRunner } from './inventory/github.ts'
import { run } from './inventory/shell.ts'

/**
 * A gh that answers like the account `owner` owning the given repos, every other call gets an empty list
 * @param repos the repos, as the GitHub API lists them
 * @returns the fake runner
 */
function fakeAccount(repos: readonly Record<string, unknown>[] = []) {
  return vi.fn<GhRunner>(args => Promise.resolve({ ok: true, stderr: '', stdout: JSON.stringify(args.includes('user') ? { login: 'owner' } : [repos]) }))
}

/**
 * A repo as the GitHub API lists it
 * @param name the repo name
 * @param isFork true for a fork
 * @returns the API repo
 */
function apiRepo(name: string, isFork: boolean) {
  return { archived: false, fork: isFork, name, owner: { login: 'owner' }, private: false, pushed_at: '' }
}

/**
 * Run the CLI and capture what it prints
 * @param argv the arguments
 * @param environment what to change in the environment
 * @returns the exit code and the printed text
 */
async function cli(argv: readonly string[], environment: Partial<CliEnvironment> = {}) {
  const printed: string[] = []
  const code = await runCli(argv, { cwd: tmpdir(), gh: fakeAccount(), hasColors: false, print: text => printed.push(text), ...environment })
  return { code, output: printed.join('\n') }
}

/**
 * Create an empty folder, removed when the test ends
 * @returns the folder path
 */
async function makeEmptyFolder() {
  const folder = await mkdtemp(path.join(tmpdir(), 'repo-check-cli-'))
  onTestFinished(() => rm(folder, { force: true, recursive: true }))
  return folder
}

describe('cli', () => {
  it('shows the usage', async () => {
    expect.hasAssertions()
    const { code, output } = await cli(['--help'])
    expect(code).toBe(0)
    expect(output).toContain('Usage: repo-check [options]')
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
    const { code, output } = await cli([], { cwd: folder })
    expect(code).toBe(0)
    expect(output).toMatch(new RegExp(`^repo-check · ${folder} · owner · 0 projects in \\d+\\.\\ds\\n✔ all good$`, 'u'))
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
    const { code, output } = await cli([], { cwd: await makeEmptyFolder(), gh: fakeAccount([apiRepo('lib', true)]) })
    expect(code).toBe(0)
    expect(output).toContain('pristine-fork')
  })

  it('exits with 1 when a finding is an error', async () => {
    expect.hasAssertions()
    const folder = await makeEmptyFolder()
    await run('git', ['init', '--quiet', 'app'], folder)
    await run('git', ['remote', 'add', 'origin', 'git@github.com:owner/app.git'], path.join(folder, 'app'))
    const { code, output } = await cli(['--no-fetch'], { cwd: folder, gh: fakeAccount([apiRepo('app', false)]) })
    expect(code).toBe(1)
    expect(output).toContain('package-json-exists')
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
