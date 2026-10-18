import path from 'node:path'
import { createActions } from './actions/actions.ts'
import { createApp, type ScanRunner } from './app.ts'
import type { AnyRule } from './engine/define-project-rule.ts'
import { createRuleSet, type RuleSet } from './engine/load-rules.ts'
import type { GhRunner } from './inventory/github.ts'
import { createProjectMemory, type ProjectMemory } from './project-memory.ts'
import { scan } from './scan.ts'
import type { OpenBrowser } from './open-browser.ts'
import type { StartServer } from './serve.ts'

/** The port of `repo-check ui` when --port is not given */
export const defaultPort = 4747

/** The highest TCP port */
const maxPort = 65_535

/** The web app built by Vite, `dist/web` seen from `src/server` and from `dist/server` alike */
const webFolder = path.resolve(import.meta.dirname, '..', '..', 'dist', 'web')

/** What the ui server needs from the command line */
interface UiOptions {
  /** False with `--no-fetch`, the page cannot ask for a fetch then */
  fetch: boolean | undefined
  /** True with `--nitpick`, the nitpick rules run from the start */
  isNitpick: boolean
  /** The GitHub owner given with `--owner`, undefined for the gh login */
  owner: string | undefined
  /** The port as typed, the default port when undefined */
  port: string | undefined
  /** The rules of both flavors */
  rules: readonly AnyRule[]
  /** False with `--no-open`, the browser is not opened */
  shouldOpen: boolean | undefined
  /** The folder to scan, already resolved */
  target: string
}

/** What the ui server needs from its environment */
export interface UiEnvironment {
  /** Runs gh */
  gh: GhRunner
  /** Stop the process, called when the page asks for a shutdown */
  exit: () => void
  /** Open the dashboard in the default browser */
  openBrowser: OpenBrowser
  /** Print a block of text */
  print: (text: string) => void
  /** Start a new server in place of this one, called when the page asks for a restart once this server stopped listening */
  restart: () => void
  /** Start the HTTP server */
  startServer: StartServer
}

/**
 * Read the port of the ui server
 * @param value the port as typed, the default port when undefined
 * @returns the port
 * @throws {TypeError} when it is not a whole number between 0 and 65535
 */
function parsePort(value = String(defaultPort)) {
  const port = Number(value)
  if (!Number.isInteger(port) || port < 0 || port > maxPort) throw new TypeError(`the port ${value} is not a number between 0 and ${maxPort}`)
  return port
}

/**
 * Make the scan the page can ask for: a scan that changes the nitpick mode checks every project again, because the remembered results were checked in the other mode
 * @param context what the scan needs
 * @param context.fetch false with `--no-fetch`
 * @param context.gh runs gh
 * @param context.memory remembers the results
 * @param context.owner the owner given with `--owner`
 * @param context.ruleSet the rules, whose nitpick mode follows the scans
 * @param context.rules the rules of both flavors
 * @param context.target the folder to scan
 * @returns the scan runner
 */
function scanRunner({ fetch, gh, memory, owner, ruleSet, rules, target }: Readonly<{ fetch: boolean | undefined; gh: GhRunner; memory: ProjectMemory; owner: string | undefined; ruleSet: RuleSet; rules: readonly AnyRule[]; target: string }>): ScanRunner {
  return ({ isNitpick, shouldFetch, shouldReuse }, hooks) => {
    const wanted = isNitpick ?? ruleSet.isNitpick
    const isChanged = wanted !== ruleSet.isNitpick
    ruleSet.isNitpick = wanted
    return scan({ gh, isNitpick: wanted, memory, owner, rules, shouldFetch: fetch !== false && shouldFetch, shouldReuse: shouldReuse && !isChanged, target }, hooks)
  }
}

/**
 * Start the ui server on the target, it keeps running until the process stops
 * @param options what the server needs from the command line
 * @param options.fetch false with `--no-fetch`
 * @param options.isNitpick true with `--nitpick`
 * @param options.owner the owner given with `--owner`
 * @param options.port the port as typed
 * @param options.rules the rules
 * @param options.shouldOpen false with `--no-open`
 * @param options.target the folder to scan
 * @param environment what the server needs from its environment
 * @param environment.exit stops the process
 * @param environment.gh runs gh
 * @param environment.openBrowser open the dashboard in the browser
 * @param environment.print print a block of text
 * @param environment.restart start a new server in place of this one
 * @param environment.startServer start the HTTP server
 * @returns 0, the server keeps the process alive
 * @throws {TypeError} when the port is wrong
 * @example await startUi({ fetch: true, isNitpick: false, owner: undefined, port: undefined, rules, shouldOpen: true, target }, { exit, gh: ghCli, openBrowser, print: console.log, restart, startServer })
 */
export async function startUi({ fetch, isNitpick, owner, port, rules, shouldOpen, target }: Readonly<UiOptions>, { exit, gh, openBrowser, print, restart, startServer }: Readonly<UiEnvironment>) {
  const listenOn = parsePort(port)
  const memory = createProjectMemory()
  const started = Promise.withResolvers<Awaited<ReturnType<StartServer>>>()
  const ruleSet = createRuleSet(rules, isNitpick)
  const actions = createActions({ gh, memory, owner, rules: ruleSet, target })
  const app = createApp(scanRunner({ fetch, gh, memory, owner, ruleSet, rules, target }), {
    actions,
    isNitpick: () => ruleSet.isNitpick,
    restart: () => {
      actions.stopSessions()
      void started.promise.then(server => server.close()).then(restart)
    },
    shutdown: () => {
      actions.stopSessions()
      exit()
    },
    target,
    webFolder,
  })
  const server = await startServer(app.fetch, listenOn)
  started.resolve(server)
  const { url } = server
  print(`repo-check ui · ${target}\nopen ${url} in your browser\npress Ctrl+C to stop`)
  if (shouldOpen !== false) openBrowser(url)
  return 0
}
