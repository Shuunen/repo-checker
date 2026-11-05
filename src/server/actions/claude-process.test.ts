import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathWith, writeFakeCommand } from '../fake-command-fixtures.ts'
import { spawnClaude } from './claude-process.ts'

/** The program of the fake claude: it prints its arguments, then each line it receives with a prefix */
const fakeClaudeSource = String.raw`import { createInterface } from 'node:readline'
console.log('args:' + process.argv.slice(2).join(' '))
createInterface({ input: process.stdin }).on('line', line => console.log('got:' + line))
`

/**
 * Put a fake `claude` first in the PATH: it says hello, then prints each line it receives with a prefix, and stops when its input closes
 * @returns the folder it runs in
 */
async function installFakeClaude() {
  const folder = await mkdtemp(path.join(tmpdir(), 'repo-check-claude-'))
  await writeFakeCommand(folder, 'claude', fakeClaudeSource)
  vi.stubEnv('PATH', pathWith(folder))
  onTestFinished(async () => {
    vi.unstubAllEnvs()
    await rm(folder, { force: true, recursive: true })
  })
  return folder
}

/**
 * Start the fake claude and collect what it prints until it stops
 * @param folder the folder to run it in
 * @returns the claude, the lines, and a promise of the message of its end
 */
function start(folder: string) {
  const lines: string[] = []
  const exited = Promise.withResolvers<string>()
  const claude = spawnClaude(folder, { onExit: message => exited.resolve(message), onLine: line => lines.push(line) })
  return { claude, exited: exited.promise, lines }
}

describe(spawnClaude, () => {
  it('starts claude in the folder with the stream-json arguments, and gives its lines', async () => {
    expect.hasAssertions()
    const folder = await installFakeClaude()
    const { claude, exited, lines } = start(folder)
    claude.write('hello\n')
    await vi.waitFor(() => expect(lines).toHaveLength(2))
    claude.kill()
    await exited
    expect(lines[0]).toBe('args:--print --input-format stream-json --output-format stream-json --verbose --permission-prompts none --disallowed-tools AskUserQuestion')
  })

  it('says why it stopped, with its code', async () => {
    expect.hasAssertions()
    const folder = await installFakeClaude()
    const { claude, exited } = start(folder)
    claude.kill()
    await expect(exited).resolves.toMatch(/^claude stopped/u)
  })

  it('says it stopped with the exit code when claude ends by itself', async () => {
    expect.hasAssertions()
    const folder = await installFakeClaude()
    await writeFakeCommand(folder, 'claude', 'process.exit(3)\n')
    await expect(start(folder).exited).resolves.toBe('claude stopped with code 3')
  })

  it('says it could not start when there is no claude, and ignores what is written to it after', async () => {
    expect.hasAssertions()
    vi.stubEnv('PATH', '/nonexistent')
    onTestFinished(() => {
      vi.unstubAllEnvs()
    })
    const { claude, exited } = start(tmpdir())
    claude.write('hello\n')
    await expect(exited).resolves.toMatch(/^could not start claude: /u)
  })

  it('ignores the failure of a write to a claude that is stopped while it is still being written to', async () => {
    expect.hasAssertions()
    const folder = await installFakeClaude()
    await writeFakeCommand(folder, 'claude', 'setTimeout(() => {}, 5000)\n')
    const { claude, exited } = start(folder)
    claude.write(`${'x'.repeat(2_000_000)}\n`)
    claude.kill()
    await expect(exited).resolves.toMatch(/^claude stopped/u)
    await new Promise(resolve => {
      setTimeout(resolve, 100)
    })
  })
})
