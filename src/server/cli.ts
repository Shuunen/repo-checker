import path from 'node:path'
import { parseArgs } from 'node:util'
import { loadRules } from './engine/load-rules.ts'
import type { GhRunner } from './inventory/github.ts'
import { formatReport } from './report.ts'
import { scan } from './scan.ts'

/** The usage, shown by --help and after a wrong option */
const usage = `Usage: repo-check [options]

Checks the projects of a folder against GitHub, or a single project when run inside one. Report only, it changes nothing.

Options:
  --target=path   folder to scan, the current one by default
  --owner=name    GitHub account to compare with, the gh login by default (in a single project, the owner of its origin)
  --no-fetch      skip git fetch, faster but unpushed work is measured against stale remote refs
  -h, --help      show this help`

/** What the CLI needs from its environment, so tests can run it without a terminal */
export interface CliEnvironment {
  /** The current folder, the default target */
  cwd: string
  /** Runs gh */
  gh: GhRunner
  /** Color the output */
  hasColors: boolean
  /** Print a block of text */
  print: (text: string) => void
}

/**
 * Parse the command line
 * @param argv the arguments, without node and the script
 * @returns the options
 * @throws {TypeError} on an unknown option or a missing value
 */
function parseOptions(argv: readonly string[]) {
  const { values } = parseArgs({ allowNegative: true, args: [...argv], options: { fetch: { default: true, type: 'boolean' }, help: { short: 'h', type: 'boolean' }, owner: { type: 'string' }, target: { type: 'string' } } })
  return values
}

/**
 * Scan the target and print the report
 * @param options the parsed options
 * @param environment the environment
 * @param environment.cwd the current folder
 * @param environment.gh runs gh
 * @param environment.hasColors color the output
 * @param environment.print print a block of text
 * @returns the exit code: 1 when a finding is an error, 0 otherwise
 */
async function scanAndReport(options: Readonly<ReturnType<typeof parseOptions>>, { cwd, gh, hasColors, print }: Readonly<CliEnvironment>) {
  const started = Date.now()
  const target = path.resolve(cwd, options.target ?? '.')
  const { owner, projects } = await scan({ gh, owner: options.owner, rules: await loadRules(path.join(import.meta.dirname, 'rules')), shouldFetch: options.fetch, target })
  const { hasErrors, text } = formatReport(projects, { durationMs: Date.now() - started, hasColors, owner, target })
  print(text)
  return hasErrors ? 1 : 0
}

/**
 * Run the CLI: scan, print the report grouped by severity, and give the exit code
 * @param argv the arguments, without node and the script
 * @param environment the environment
 * @returns the exit code: 0 when no finding is an error, 1 otherwise or when the scan failed
 * @example process.exitCode = await runCli(process.argv.slice(2), { cwd: process.cwd(), gh: ghCli, hasColors: true, print: console.log })
 */
export async function runCli(argv: readonly string[], environment: Readonly<CliEnvironment>) {
  const { print } = environment
  try {
    const options = parseOptions(argv)
    if (options.help !== true) return await scanAndReport(options, environment)
    print(usage)
    return 0
  } catch (error) {
    print(`repo-check failed: ${error instanceof Error ? error.message : String(error)}\n\n${usage}`)
    return 1
  }
}
