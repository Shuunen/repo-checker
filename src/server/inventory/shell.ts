import { execFile } from 'node:child_process'

/** The only binaries the tool runs */
export type Binary = 'gh' | 'git'

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
 * Run a command: a fixed binary and an argument array, never a shell string, so user data never becomes shell syntax. Git never prompts for credentials
 * @param binary the binary
 * @param args the arguments
 * @param cwd the folder to run in, the current one when omitted
 * @returns the outcome, it never throws
 * @example const { ok, stdout } = await run('git', ['remote', 'get-url', 'origin'], folder)
 */
export function run(binary: Binary, args: readonly string[], cwd?: string) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  return new Promise<ShellResult>(resolve => {
    execFile(binary, args, { cwd, encoding: 'utf8', env, maxBuffer: maxOutputBytes }, (error, stdout, stderr) => {
      resolve({ ok: error === null, stderr: stderr || (error?.message ?? ''), stdout })
    })
  })
}
