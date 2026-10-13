import type { StartServer } from './serve.ts'
import { cli, fakeCloneGh, makeEmptyFolder, ui } from './cli-fixtures.ts'

describe('cli ui', () => {
  it('starts the server on the default port', async () => {
    expect.hasAssertions()
    const { code, folder, output, startServer } = await ui()
    expect(code).toBe(0)
    expect(output).toBe(`repo-check ui · ${folder}\nopen http://127.0.0.1:4747 in your browser\npress Ctrl+C to stop`)
    expect(startServer).toHaveBeenCalledWith(expect.any(Function), 4747)
  })

  it('streams the scan of the target, with git fetch', async () => {
    expect.hasAssertions()
    const { scan } = await ui()
    const body = await scan()
    expect(body).toContain('each clone is fetched just before its check')
    expect(body).toContain('event: done')
  })

  it.each([
    ['--no-fetch', ['--no-fetch'], ''],
    ['the page asks for no fetch', [], '?fetch=false'],
  ])('streams the scan without git fetch when %s', async (_name, argv, query) => {
    expect.hasAssertions()
    const { scan } = await ui(argv)
    await expect(scan(query)).resolves.not.toContain('each clone is fetched just before its check')
  })

  it.each([
    ['the gh login', [], 'owner/finga'],
    ['the --owner option', ['--owner=someone'], 'someone/finga'],
  ])('asks GitHub about a repo of %s, then clones it over SSH', async (_name, argv, slug) => {
    expect.hasAssertions()
    vi.stubEnv('GIT_SSH_COMMAND', 'false')
    onTestFinished(() => {
      vi.unstubAllEnvs()
    })
    const gh = fakeCloneGh(slug)
    const { clone } = await ui(argv, gh)
    await expect(clone('finga')).resolves.toMatchObject({ ok: false, reason: expect.stringContaining(`git clone git@github.com:${slug}.git failed`) })
    expect(gh).toHaveBeenLastCalledWith(['api', `repos/${slug}`])
  })

  it.each(['GET', 'POST'] as const)('wires the delete of a clone with %s, and refuses a repo that is not archived', async method => {
    expect.hasAssertions()
    const { call } = await ui([], fakeCloneGh('owner/finga'))
    await expect(call('finga/delete-clone', method)).resolves.toStrictEqual({ ok: false, reason: 'owner/finga is not archived, this only applies to the clone of an archived repo' })
  })

  it('wires the unarchive and push, and refuses a repo that is not archived', async () => {
    expect.hasAssertions()
    const { call } = await ui([], fakeCloneGh('owner/finga'))
    await expect(call('finga/unarchive-push', 'POST')).resolves.toStrictEqual({ ok: false, reason: 'owner/finga is not archived, this only applies to the clone of an archived repo' })
  })

  it('wires the discard, its preview and its fingerprint, and refuses a repo that is not archived', async () => {
    expect.hasAssertions()
    const { call } = await ui([], fakeCloneGh('owner/finga'))
    const reason = 'owner/finga is not archived, this only applies to the clone of an archived repo'
    await expect(call('finga/discard', 'GET')).resolves.toStrictEqual({ ok: false, reason })
    await expect(call('finga/discard?fingerprint=abc', 'POST')).resolves.toStrictEqual({ ok: false, reason })
  })

  it.each(['GET', 'POST'] as const)('wires the delete of a fork with %s, and refuses a repo that is not a fork', async method => {
    expect.hasAssertions()
    const { call } = await ui([], fakeCloneGh('owner/finga'))
    await expect(call('finga/delete-fork', method)).resolves.toStrictEqual({ ok: false, reason: 'owner/finga is not a fork, this only applies to a fork' })
  })

  it('opens the dashboard in the browser, unless --no-open', async () => {
    expect.hasAssertions()
    const opened = await ui()
    const kept = await ui(['--no-open'])
    expect(opened.openBrowser).toHaveBeenCalledWith('http://127.0.0.1:4747')
    expect(kept.openBrowser).not.toHaveBeenCalled()
  })

  it('wires the rescan of one project, and says a repo that is not on GitHub is gone', async () => {
    expect.hasAssertions()
    const { call } = await ui([], fakeCloneGh('owner/finga'))
    await expect(call('finga/rescan', 'GET')).resolves.toMatchObject({ ok: true, project: { project: { name: 'finga' } } })
  })

  it.each([
    ['GET', 'finga/fix-files'],
    ['POST', 'finga/fix-files?fingerprint=abc'],
  ] as const)('wires the file fixes with %s, and finds no clone to fix in an empty folder', async (method, route) => {
    expect.hasAssertions()
    const { call } = await ui([], fakeCloneGh('owner/finga'))
    await expect(call(route, method)).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('no clone of owner/finga that holds files to fix in') })
  })

  it('takes the port from the options', async () => {
    expect.hasAssertions()
    const startServer = vi.fn<StartServer>(() => Promise.resolve({ close: () => Promise.resolve(), url: 'http://127.0.0.1:8080' }))
    await cli(['ui', '--port=8080'], { cwd: await makeEmptyFolder(), startServer })
    expect(startServer).toHaveBeenCalledWith(expect.any(Function), 8080)
  })

  it.each(['abc', '-1', '70000', '1.5'])('refuses the port %s', async port => {
    expect.hasAssertions()
    const { code, output } = await cli(['ui', `--port=${port}`])
    expect(code).toBe(1)
    expect(output).toContain(`repo-check failed: the port ${port} is not a number between 0 and 65535`)
  })

  it('refuses an unknown command', async () => {
    expect.hasAssertions()
    const { code, output } = await cli(['serve'])
    expect(code).toBe(1)
    expect(output).toContain("repo-check failed: Unknown command 'serve'")
  })
})
