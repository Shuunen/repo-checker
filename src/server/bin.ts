#!/usr/bin/env bun
import { runCli } from './cli.ts'
import { ghCli } from './inventory/github.ts'

/** `process.argv` starts with node and this script */
const firstArgument = 2

process.exitCode = await runCli(process.argv.slice(firstArgument), { cwd: process.cwd(), gh: ghCli, hasColors: process.stdout.isTTY, print: text => process.stdout.write(`${text}\n`), printProgress: line => process.stderr.write(`› ${line}\n`) })
