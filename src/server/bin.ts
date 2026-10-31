#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { utimesSync } from 'node:fs'
import { runCli } from './cli.ts'
import { ghCli } from './inventory/github.ts'
import { browserCommand } from './open-browser.ts'
import { startServer } from './serve.ts'
import { watchUi } from './watch.ts'

/** The flag that runs the ui server for development, handled here and not by the CLI */
const watchFlag = '--watch'

/** `process.argv` starts with node and this script */
const firstArgument = 2

/**
 * Open a page in the default browser, without a shell and without waiting for it. Without a browser the address is printed anyway, so a failure to start is ignored
 * @param url the address to open
 */
function openBrowser(url: string) {
  const [command = 'xdg-open', ...args] = browserCommand(process.platform, url)
  spawn(command, args, { detached: true, stdio: 'ignore' })
    .on('error', () => undefined)
    .unref()
}

/**
 * Stop the server. In `--watch` the process runs under the watcher, which would wait for changes after it ends, so it asks the dev launcher to stop everything instead
 */
function exit() {
  if (process.env.REPO_CHECK_PARENT === undefined) process.exit(0)
  else process.kill(Number(process.env.REPO_CHECK_PARENT), 'SIGTERM')
}

/**
 * Start a new server in place of this one, once this one stopped listening. In `--watch` the watcher restarts the process when its script changes, so touching the script is enough. Otherwise a copy is started with the same arguments, detached from this process, which then ends
 */
function restart() {
  if (process.env.REPO_CHECK_PARENT === undefined) {
    spawn(process.execPath, [...process.execArgv, ...process.argv.slice(1), '--no-open'], { detached: true, stdio: 'inherit' }).unref()
    process.exit(0)
  } else utimesSync(import.meta.filename, new Date(), new Date())
}

const argv = process.argv.slice(firstArgument)

process.exitCode = argv.includes(watchFlag)
  ? await watchUi(
      import.meta.filename,
      argv.filter(argument => argument !== watchFlag),
    )
  : await runCli(argv, { cwd: process.cwd(), exit, gh: ghCli, hasColors: process.stdout.isTTY, openBrowser, print: text => process.stdout.write(`${text}\n`), printProgress: line => process.stderr.write(`› ${line}\n`), restart, startServer })
