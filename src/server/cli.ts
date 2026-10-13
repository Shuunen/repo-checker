import { stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { loadRules } from './engine/load-rules.ts'
import { formatReport } from './report.ts'
import { scan } from './scan.ts'
import { defaultPort, startUi, type UiEnvironment } from './ui.ts'

/** The usage, shown by --help and after a wrong option */
const usage = `Usage: repo-check [ui] [options]

Checks the projects of a folder against GitHub, or a single project when run inside one. Report only, it changes nothing.

Commands:
  ui              start the local server on 127.0.0.1 instead, it streams the scan to the dashboard

Options:
  --target=path   folder to scan, the current one by default
  --owner=name    GitHub account to compare with, the gh login by default (in a single project, the owner of its origin)
  --no-fetch      skip git fetch, faster but unpushed work is measured against stale remote refs
  --verbose       also list every passed and skipped check, per project
  --port=number   port of the ui server, ${defaultPort} by default
  --no-open       do not open the browser (ui only)
  -h, --help      show this help`

/** What the CLI needs from its environment, so tests can run it without a terminal: what `repo-check ui` needs (gh, the browser, the output, the server), and the report's own */
export interface CliEnvironment extends UiEnvironment {
  /** The current folder, the default target */
  cwd: string
  /** Color the output */
  hasColors: boolean
  /** Print a progress line, on stderr so it never mixes with the report */
  printProgress: (line: string) => void
}

/**
 * Parse the command line
 * @param argv the arguments, without node and the script
 * @returns the options, and the command: `ui` or undefined for the report
 * @throws {TypeError} on an unknown option, a missing value or an unknown command
 */
function parseOptions(argv: readonly string[]) {
  const { positionals, values } = parseArgs({
    allowNegative: true,
    allowPositionals: true,
    args: [...argv],
    options: { fetch: { default: true, type: 'boolean' }, help: { short: 'h', type: 'boolean' }, open: { default: true, type: 'boolean' }, owner: { type: 'string' }, port: { type: 'string' }, target: { type: 'string' }, verbose: { type: 'boolean' } },
  })
  const command = positionals.join(' ')
  if (command !== '' && command !== 'ui') throw new TypeError(`Unknown command '${command}'`)
  return { ...values, isUi: command === 'ui' }
}

/**
 * Expand a leading `~` to the home folder, the shell does not do it after `--target=`
 * @param value the target as typed
 * @param home the home folder
 * @returns the target with `~` expanded
 * @example expandHome('~/Projects', '/home/me') // '/home/me/Projects'
 */
export function expandHome(value: string, home: string) {
  return value === '~' || value.startsWith('~/') ? path.join(home, value.slice(1)) : value
}

/**
 * Resolve the target folder
 * @param cwd the current folder
 * @param value the target as typed, the current folder when undefined
 * @returns the absolute target path
 * @throws {Error} when the target is not an existing folder
 */
async function resolveTarget(cwd: string, value = '.') {
  const target = path.resolve(cwd, expandHome(value, homedir()))
  const stats = await stat(target).catch(() => undefined)
  if (stats?.isDirectory() !== true) throw new Error(`the target ${target} is not a folder`)
  return target
}

/** Where the rules are, next to this file in the sources and in the build */
const rulesFolder = path.join(import.meta.dirname, 'rules')

/**
 * Resolve the target and the rules, then start the ui server on it
 * @param options the parsed options
 * @param environment the environment
 * @param environment.cwd the current folder
 * @param environment.gh runs gh
 * @param environment.openBrowser open the dashboard in the browser
 * @param environment.print print a block of text
 * @param environment.startServer start the HTTP server
 * @returns 0, the server keeps the process alive
 */
async function runUi(options: Readonly<ReturnType<typeof parseOptions>>, { cwd, gh, openBrowser, print, startServer }: Readonly<CliEnvironment>) {
  const target = await resolveTarget(cwd, options.target)
  return startUi({ fetch: options.fetch, owner: options.owner, port: options.port, rules: await loadRules(rulesFolder), shouldOpen: options.open, target }, { gh, openBrowser, print, startServer })
}

/**
 * Scan the target and print the report
 * @param options the parsed options
 * @param environment the environment
 * @param environment.cwd the current folder
 * @param environment.gh runs gh
 * @param environment.hasColors color the output
 * @param environment.print print a block of text
 * @param environment.printProgress print a progress line
 * @returns the exit code: 1 when a finding is an error, 0 otherwise
 */
async function scanAndReport(options: Readonly<ReturnType<typeof parseOptions>>, { cwd, gh, hasColors, print, printProgress }: Readonly<CliEnvironment>) {
  const started = Date.now()
  const target = await resolveTarget(cwd, options.target)
  const rules = await loadRules(rulesFolder)
  const { owner, projects } = await scan({ gh, owner: options.owner, rules, shouldFetch: options.fetch, target }, { onProgress: printProgress })
  const { hasErrors, text } = formatReport(projects, { durationMs: Date.now() - started, hasColors, isVerbose: options.verbose === true, owner, target })
  print(text)
  return hasErrors ? 1 : 0
}

/**
 * Run the CLI: scan, print the report grouped by severity, and give the exit code. With the `ui` command, start the server instead
 * @param argv the arguments, without node and the script
 * @param environment the environment
 * @returns the exit code: 0 when no finding is an error or when the server started, 1 otherwise or when the scan failed
 * @example process.exitCode = await runCli(process.argv.slice(2), { cwd: process.cwd(), gh: ghCli, hasColors: true, print: console.log })
 */
export async function runCli(argv: readonly string[], environment: Readonly<CliEnvironment>) {
  const { print } = environment
  try {
    const options = parseOptions(argv)
    if (options.help !== true) return await (options.isUi ? runUi(options, environment) : scanAndReport(options, environment))
    print(usage)
    return 0
  } catch (error) {
    print(`repo-check failed: ${error instanceof Error ? error.message : String(error)}\n\n${usage}`)
    return 1
  }
}
