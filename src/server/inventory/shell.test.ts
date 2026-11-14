import { run, startPlan } from './shell.ts'

describe(startPlan, () => {
  it.each([
    { args: ['status'], binary: 'git', expected: { args: ['status'], file: 'git', shell: false }, platform: 'win32' },
    { args: ['run', 'check'], binary: 'pnpm', expected: { args: ['run', 'check'], file: 'pnpm', shell: false }, platform: 'linux' },
    { args: ['run', 'check'], binary: 'pnpm', expected: { args: [], file: 'pnpm run check', shell: true }, platform: 'win32' },
    { args: ['add'], binary: 'bun', expected: { args: [], file: 'bun add', shell: true }, platform: 'win32' },
    { args: ['--print'], binary: 'claude', expected: { args: [], file: 'claude --print', shell: true }, platform: 'win32' },
  ])('starts $binary on $platform with shell $expected.shell', ({ args, binary, expected, platform }) => {
    expect.hasAssertions()
    expect(startPlan(binary, args, platform)).toStrictEqual(expected)
  })
})

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
