import { spawn } from 'node:child_process'
import path from 'node:path'
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
 * Run the ui server for development: the api restarts itself when a server file changes, and Vite serves the web app with hot reload and proxies `/api` to it. Stops both on Ctrl+C
 * @param script the path of the bin script, the one the api restarts from
 * @param argv the arguments of the ui server, without `--watch`
 * @returns the code to exit with once stopped
 * @example process.exitCode = await watchUi(process.argv[1], ['ui', '--target=..'])
 */
export async function watchUi(script: string, argv: readonly string[]) {
  const api = spawn(process.execPath, ['--watch', path.resolve(script), ...argv, '--no-open'], { env: { ...process.env, REPO_CHECK_PARENT: String(process.pid) }, stdio: 'inherit' })
  process.env.REPO_CHECK_PORT = portOf(argv)
  const { createServer } = (await import(viteModule)) as { createServer: (config: object) => Promise<WebServer> }
  const web = await createServer({ server: { open: true } })
  await web.listen()
  web.printUrls()
  return new Promise<number>(resolve => {
    const stop = () => {
      api.kill()
      void web.close().then(() => resolve(0))
    }
    api.once('exit', stop)
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  })
}
