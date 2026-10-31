import { run } from './shell.ts'

describe('shell', () => {
  it('runs a binary with an argument array', async () => {
    expect.hasAssertions()
    await expect(run('git', ['--version'])).resolves.toMatchObject({ ok: true, stderr: '', stdout: expect.stringContaining('git version') })
  })

  it('reports a failing command with its error output', async () => {
    expect.hasAssertions()
    await expect(run('git', ['not-a-command'])).resolves.toMatchObject({ ok: false, stderr: expect.stringContaining('not-a-command') })
  })

  it('reports a command that cannot start with the error message', async () => {
    expect.hasAssertions()
    await expect(run('git', ['--version'], '/missing/folder')).resolves.toMatchObject({ ok: false, stderr: expect.stringContaining('ENOENT') })
  })

  it('never treats arguments as shell syntax', async () => {
    expect.hasAssertions()
    await expect(run('git', ['--version; echo injected'])).resolves.toMatchObject({ ok: false, stdout: '' })
  })
})
