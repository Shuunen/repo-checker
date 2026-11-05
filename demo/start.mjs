import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { buildWorld } from './build-world.mjs'

const root = path.join(tmpdir(), 'repo-check-demo')
const projects = buildWorld(root)
const bin = path.join(import.meta.dirname, '..', 'src', 'server', 'bin.ts')
// the fake gh of this folder comes first in the PATH, and the home folder is the demo world so the page shows `~/projects`
const env = { ...process.env, HOME: root, PATH: `${import.meta.dirname}${path.delimiter}${process.env.PATH}` }
const child = spawn(process.execPath, [bin, 'ui', `--target=${projects}`, '--no-fetch', '--port=4760', ...process.argv.slice(2)], { env, stdio: 'inherit' })
child.on('exit', code => process.exit(code ?? 0))
