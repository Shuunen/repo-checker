import { execFile } from 'node:child_process'

/** The only binaries the tool runs */
export type Binary = 'bun' | 'gh' | 'git' | 'pnpm'

/** The outcome of one command */
export interface ShellResult {
  /** True when the command exited with code 0 */
  ok: boolean
  /** The error output, or the error message when the command could not start */
  stderr: string
  /** The standard output */
  stdout: string
}

/** 64 MB, enough for `gh api --paginate` on a few hundred repos */
const maxOutputBytes = 67_108_864

/**
 * How to start a binary on a platform. On Windows the package managers and claude are `.cmd` files that only a shell can start: the command is then one string made of fixed words, never of user data
 * @param binary the binary
 * @param args the arguments
 * @param platform `process.platform`
 * @returns the file to start, its arguments, and whether a shell starts it
 * @example startPlan('git', ['status'], 'win32') // { args: ['status'], file: 'git', shell: false }
 */
export function startPlan(binary: string, args: readonly string[], platform: string) {
  const needsShell = platform === 'win32' && (binary === 'pnpm' || binary === 'bun' || binary === 'claude')
  return needsShell ? { args: [], file: [binary, ...args].join(' '), shell: true } : { args, file: binary, shell: false }
}

/**
 * Run a command: a fixed binary and an argument array, never a shell string, so user data never becomes shell syntax. Git never prompts for credentials
 * @param binary the binary
 * @param args the arguments
 * @param cwd the folder to run in, the current one when omitted
 * @returns the outcome, it never throws
 * @example const { ok, stdout } = await run('git', ['remote', 'get-url', 'origin'], folder)
 */
export function run(binary: Binary, args: readonly string[], cwd?: string) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  // oxlint-disable-next-line promise/avoid-new -- wraps the execFile callback
  return new Promise<ShellResult>(resolve => {
    const plan = startPlan(binary, args, process.platform)
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- node callback
    execFile(plan.file, plan.args, { cwd, encoding: 'utf8', env, maxBuffer: maxOutputBytes, shell: plan.shell }, (error, stdout, stderr) => {
      resolve({ ok: error === null, stderr: stderr || (error?.message ?? ''), stdout })
    })
  })
}
