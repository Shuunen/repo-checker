import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { noop } from 'es-toolkit'
import type { SpawnClaude } from './claude-session.ts'

/** What `claude` is started with: no screen, the messages come as JSON lines on its input and everything it does goes out as JSON lines. What would ask a permission is refused, the update skill brings the tools it needs, and the question tool is off since its menu can not be shown here, Claude asks in plain text */
const args = ['--print', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--permission-prompts', 'none', '--disallowed-tools', 'AskUserQuestion']

/**
 * Start the real `claude`, the only program other than git, gh and the package manager the tool runs. A fixed binary and an argument array, never a shell string
 * @param cwd the folder to run in, the clone of the project
 * @param handlers what to do with its lines and its end
 * @param handlers.onExit called when it stops or could not start
 * @param handlers.onLine called with each line it prints
 * @returns the running claude
 * @example const claude = spawnClaude('/home/me/app', { onExit: console.log, onLine: console.log })
 */
export const spawnClaude: SpawnClaude = (cwd, { onExit, onLine }) => {
  const child = spawn('claude', args, { cwd, stdio: ['pipe', 'pipe', 'ignore'] })
  createInterface({ input: child.stdout }).on('line', onLine)
  child.stdin.on('error', noop)
  child.on('error', error => onExit(`could not start claude: ${error.message}`))
  child.on('close', code => onExit(`claude stopped${code === null ? '' : ` with code ${code}`}`))
  return { kill: () => child.kill(), write: line => child.stdin.write(line) }
}
