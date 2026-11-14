import { spawn } from 'node:child_process'
import path from 'node:path'
import { createInterface } from 'node:readline'
import { styleText } from 'node:util'
import { defaultPort } from './ui.ts'

/** The module of the web dev server, a variable so the build leaves it out: it is a dev dependency, only `--watch` loads it */
const viteModule = 'vite'

/** The part of a Vite dev server used here */
interface WebServer {
  /** Stop listening */
  close: () => Promise<void>
  /** Start listening */
  listen: () => Promise<unknown>
  /** Print the addresses */
  printUrls: () => void
}

/**
 * The port of the api, read from `--port=` like the ui server does
 * @param argv the arguments of the ui server
 * @returns the port as typed, the default port without `--port`
 */
function portOf(argv: readonly string[]) {
  return argv.find(argument => argument.startsWith('--port='))?.slice('--port='.length) ?? String(defaultPort)
}

/**
 * Shorten the paths under a folder in a line of the node watcher, so `C:\\Users\\me\\app\\src\\server\\ui.ts` reads `src/server/ui.ts`
 * @param line a line printed by the api process
 * @param folder the folder the paths are relative to
 * @returns the line with the paths relative to the folder, with forward slashes
 * @example shortenPaths("Change detected in 'C:\\\\app\\\\src\\\\ui.ts'", 'C:\\app') // "Change detected in 'src/ui.ts'"
 */
export function shortenPaths(line: string, folder: string) {
  const separator = String.raw`(?:\\\\|\\|/)`
  const escaped = folder
    .split(/[/\\]/u)
    .map(part => part.replaceAll(/[$()*+.?[\]^{|}]/gu, String.raw`\$&`))
    .join(separator)
  return line.replaceAll(new RegExp(String.raw`${escaped}${separator}([^\s']*)`, 'gu'), (_match, rest: string) => rest.replaceAll(/\\\\|\\/gu, '/'))
}

/**
 * Paint one word of a quoted command: the file in cyan, the flags in magenta, the other words in yellow
 * @param word a word of the command
 * @returns the painted word
 */
function paintWord(word: string) {
  if (word.startsWith('--')) return styleText('magenta', word, { validateStream: false })
  return styleText(/[./]/u.test(word) ? 'cyan' : 'yellow', word, { validateStream: false })
}

/**
 * Color a line of the api process: the quoted files and commands, the shortcuts and the actions of the watcher
 * @param line a line already shortened
 * @returns the line with ANSI colors
 * @example colorize("Restarting 'src/server/bin.ts ui'")
 */
export function colorize(line: string) {
  return line
    .replaceAll(
      /'[^']+'/gu,
      quoted =>
        `'${quoted
          .slice(1, -1)
          .split(' ')
          .map(word => paintWord(word))
          .join(' ')}'`,
    )
    .replaceAll(/\b(?:Change detected in|Completed running|Failed running|Restarting)\b/gu, action => styleText('dim', action, { validateStream: false }))
    .replaceAll(/\bCtrl\+C\b/gu, shortcut => styleText(['bold', 'yellow'], shortcut, { validateStream: false }))
    .replace(/^repo-check ui\b/u, name => styleText('bold', name, { validateStream: false }))
}

/**
 * Forward the lines of a stream of the api process, with shortened paths, and colors when the output is a terminal
 * @param stream what the api prints
 * @param output where to print it
 */
function forward(stream: NodeJS.ReadableStream, output: NodeJS.WriteStream) {
  createInterface({ input: stream }).on('line', line => {
    const shortened = shortenPaths(line, process.cwd())
    output.write(`${output.isTTY ? colorize(shortened) : shortened}\n`)
  })
}

/**
 * Run the ui server for development: the api restarts itself when a server file changes, and Vite serves the web app with hot reload and proxies `/api` to it. Stops both on Ctrl+C
 * @param script the path of the bin script, the one the api restarts from
 * @param argv the arguments of the ui server, without `--watch`
 * @returns the code to exit with once stopped
 * @example process.exitCode = await watchUi(process.argv[1], ['ui', '--target=..'])
 */
export async function watchUi(script: string, argv: readonly string[]) {
  const api = spawn(process.execPath, ['--watch', path.resolve(script), ...argv, '--no-open'], { env: { ...process.env, REPO_CHECK_PARENT: String(process.pid) }, stdio: ['inherit', 'pipe', 'pipe'] })
  forward(api.stdout, process.stdout)
  forward(api.stderr, process.stderr)
  process.env.REPO_CHECK_PORT = portOf(argv)
  const { createServer } = (await import(viteModule)) as { createServer: (config: object) => Promise<WebServer> }
  const web = await createServer({ server: { open: true } })
  await web.listen()
  web.printUrls()
  // oxlint-disable-next-line promise/avoid-new -- resolves from process events
  return new Promise<number>(resolve => {
    const stop = () => {
      api.kill()
      void (async () => {
        await web.close()
        resolve(0)
      })()
    }
    api.once('exit', stop)
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  })
}
