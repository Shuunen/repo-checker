import { memoryIo } from './engine/io.ts'
import { createFacts, realDeps, externalFlags, githubFlags } from './facts.ts'
import { startServer } from './serve.ts'

/**
 * Build fake dependencies
 * @param releases the text nodejs.org answers
 * @param config the git config values
 * @returns the dependencies
 */
function fakeDeps(releases: () => Promise<string>, config: Record<string, string> = {}) {
  return { fetchText: releases, gitConfig: (key: string) => Promise.resolve(config[key] ?? '') }
}

describe(createFacts, () => {
  it('reads the git user and the latest LTS once', async () => {
    expect.hasAssertions()
    const fetchText = vi.fn<() => Promise<string>>(() =>
      Promise.resolve(
        JSON.stringify([
          { lts: false, version: 'v25.1.0' },
          { lts: 'Krypton', version: 'v24.11.0' },
        ]),
      ),
    )
    const { globalFacts } = createFacts(fakeDeps(fetchText, { 'user.email': 'me@mail.com', 'user.name': 'Me' }))
    await expect(globalFacts()).resolves.toStrictEqual({ gitAuthor: { email: 'me@mail.com', name: 'Me' }, nodeVersion: '24.11.0' })
    await globalFacts()
    expect(fetchText).toHaveBeenCalledOnce()
  })

  it('has no author when the git user is not set, and no mail when only the name is', async () => {
    expect.hasAssertions()
    const none = createFacts(fakeDeps(() => Promise.reject(new Error('offline'))))
    await expect(none.globalFacts()).resolves.toStrictEqual({ gitAuthor: undefined, nodeVersion: '24.21.0' })
    const nameOnly = createFacts(fakeDeps(() => Promise.resolve('[]'), { 'user.name': 'Me' }))
    await expect(nameOnly.globalFacts()).resolves.toStrictEqual({ gitAuthor: { email: undefined, name: 'Me' }, nodeVersion: '24.21.0' })
  })
})

describe(githubFlags, () => {
  it('reads what GitHub says, nothing when it cannot say', () => {
    expect.hasAssertions()
    expect(githubFlags(undefined)).toStrictEqual({ githubDescription: undefined, githubTopics: undefined, isPrivate: false })
    expect(githubFlags({ description: 'A', homepage: 'https://a.b', isPrivate: true, topics: ['x'] } as never)).toStrictEqual({ githubDescription: 'A', githubTopics: ['x'], isPrivate: true })
  })
})

describe(externalFlags, () => {
  it('merges the global facts and the GitHub flags, with no network in tests', async () => {
    expect.hasAssertions()
    const flags = await externalFlags(undefined)
    expect(flags.nodeVersion).toBe('24.21.0')
    expect(flags.isPrivate).toBe(false)
  })
})

/**
 * Answer the registry and the sites like the web would, until the test ends
 * @param statuses the status of each site, a missing one does not answer
 */
function stubWeb(statuses: Readonly<Record<string, number>>) {
  const previous = globalThis.fetch
  vi.stubGlobal('fetch', (input: Parameters<typeof fetch>[0]) => {
    const url = String(input)
    if (url.startsWith('https://registry.npmjs.org/')) return Promise.resolve(url.endsWith('/bulk') ? Response.json({}) : Response.json({ version: '6.1.0' }))
    const status = statuses[url]
    return status === undefined ? Promise.reject(new Error('offline')) : Promise.resolve(new Response('', { status }))
  })
  onTestFinished(() => {
    vi.stubGlobal('fetch', previous)
  })
}

describe('the facts about the project itself', () => {
  const files = { '.repo-checker.json': '{ "webUrl": "https://app.example.dev" }', 'package.json': '{ "devDependencies": { "facts-knip": "~6.0.0" } }' }

  it('asks the npm registry and the website', async () => {
    expect.hasAssertions()
    stubWeb({ 'https://app.example.dev': 200, 'https://github.com': 200 })
    const flags = await externalFlags(undefined, { files: memoryIo(files) })
    expect(flags.registry?.packages).toStrictEqual({ 'facts-knip': { latest: '6.1.0' } })
    expect(flags.webStatus).toStrictEqual({ status: 200, url: 'https://app.example.dev' })
  })

  it('asks the GitHub Pages of a repo that has some, when the project declares no website', async () => {
    expect.hasAssertions()
    stubWeb({ 'https://github.com': 200, 'https://owner.github.io/pages-app/': 503 })
    const flags = await externalFlags({ hasPages: true, name: 'pages-app', owner: 'owner' } as never, { files: memoryIo({}) })
    expect(flags.webStatus).toStrictEqual({ status: 503, url: 'https://owner.github.io/pages-app/' })
    expect(flags.registry).toBeUndefined()
  })

  it('leaves out what the outside cannot say, and asks nothing for a project without website or dependencies', async () => {
    expect.hasAssertions()
    stubWeb({})
    const flags = await externalFlags({ hasPages: false } as never, { files: memoryIo({ 'package.json': '{}' }) })
    expect(Object.keys(flags)).not.toContain('registry')
    expect(Object.keys(flags)).not.toContain('webStatus')
  })
})

describe('real dependencies', () => {
  it('reads the text of a url', async () => {
    expect.hasAssertions()
    const server = await startServer(() => new Response('hello'), 0)
    onTestFinished(() => server.close())
    await expect(realDeps.fetchText(server.url)).resolves.toBe('hello')
  })

  it('reads a git config value, empty when unset', async () => {
    expect.hasAssertions()
    await expect(realDeps.gitConfig('repo-check.not-a-key')).resolves.toBe('')
  })
})
