#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { runCli } from './cli.ts'
import { ghCli } from './inventory/github.ts'
import { browserCommand } from './open-browser.ts'
import { startServer } from './serve.ts'

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

process.exitCode = await runCli(process.argv.slice(firstArgument), { cwd: process.cwd(), gh: ghCli, hasColors: process.stdout.isTTY, openBrowser, print: text => process.stdout.write(`${text}\n`), printProgress: line => process.stderr.write(`› ${line}\n`), startServer })
