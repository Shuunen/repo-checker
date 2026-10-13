import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { type CliEnvironment, runCli } from './cli.ts'
import type { GhRunner } from './inventory/github.ts'
import type { OpenBrowser } from './open-browser.ts'
import type { StartServer } from './serve.ts'

/**
 * A gh that answers like the account `owner` owning the given repos, every other call gets an empty list
 * @param repos the repos, as the GitHub API lists them
 * @returns the fake runner
 */
export function fakeAccount(repos: readonly Record<string, unknown>[] = []) {
  return vi.fn<GhRunner>(args => Promise.resolve({ ok: true, stderr: '', stdout: JSON.stringify(args.includes('user') ? { login: 'owner' } : [repos]) }))
}

/**
 * A repo as the GitHub API lists it
 * @param name the repo name
 * @param isFork true for a fork
 * @returns the API repo
 */
export function apiRepo(name: string, isFork: boolean) {
  return { archived: false, fork: isFork, name, owner: { login: 'owner' }, private: false, pushed_at: '' }
}

/**
 * Run the CLI and capture what it prints
 * @param argv the arguments
 * @param environment what to change in the environment
 * @returns the exit code, the printed report and the progress lines
 */
export async function cli(argv: readonly string[], environment: Partial<CliEnvironment> = {}) {
  const printed: string[] = []
  const progress: string[] = []
  const startServer = vi.fn<StartServer>(() => Promise.resolve({ close: () => Promise.resolve(), url: 'http://127.0.0.1:4747' }))
  const code = await runCli(argv, { cwd: tmpdir(), gh: fakeAccount(), hasColors: false, openBrowser: vi.fn<OpenBrowser>(), print: text => printed.push(text), printProgress: line => progress.push(line), startServer, ...environment })
  return { code, output: printed.join('\n'), progress }
}

/**
 * Create an empty folder, removed when the test ends
 * @returns the folder path
 */
export async function makeEmptyFolder() {
  const folder = await mkdtemp(path.join(tmpdir(), 'repo-check-cli-'))
  onTestFinished(() => rm(folder, { force: true, recursive: true }))
  return folder
}

/**
 * A request handler that answers nothing, until the CLI hands over its app
 * @returns an empty response
 */
function noPage() {
  return new Response('')
}

/**
 * Run `repo-check ui` in an empty folder with a fake server
 * @param argv the arguments after `ui`
 * @param gh the fake gh
 * @returns the exit code, the printed text, the fake server, and `scan` to request the scan stream and read its body
 */
export async function ui(argv: readonly string[] = [], gh = fakeAccount()) {
  const folder = await makeEmptyFolder()
  let fetchApp: Parameters<StartServer>[0] = noPage
  const startServer = vi.fn<StartServer>(fetch => {
    fetchApp = fetch
    return Promise.resolve({ close: () => Promise.resolve(), url: 'http://127.0.0.1:4747' })
  })
  const openBrowser = vi.fn<OpenBrowser>()
  const { code, output } = await cli(['ui', ...argv], { cwd: folder, gh, openBrowser, startServer })
  const scan = async (query = '') => {
    const response = await fetchApp(new Request(`http://127.0.0.1:4747/api/scan${query}`))
    return response.text()
  }
  const call = async (route: string, method: 'GET' | 'POST') => {
    const response = await fetchApp(new Request(`http://127.0.0.1:4747/api/projects/${route}`, { headers: { 'x-repo-check': '1' }, method }))
    return response.json()
  }
  const clone = (name: string) => call(`${name}/clone`, 'POST')
  return { call, clone, code, folder, openBrowser, output, scan, startServer }
}

/**
 * A gh whose login is `owner` and that has the repo `finga` under the owner of the given slug
 * @param slug the `owner/finga` slug
 * @returns the fake runner
 */
export function fakeCloneGh(slug: string) {
  const [login = ''] = slug.split('/')
  return vi.fn<GhRunner>(args => {
    const stdout = args.includes('user') ? { login: 'owner' } : { archived: false, fork: false, name: 'finga', owner: { login }, private: false, pushed_at: '' }
    return Promise.resolve({ ok: true, stderr: '', stdout: JSON.stringify(stdout) })
  })
}
