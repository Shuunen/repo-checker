import { startServer } from './serve.ts'
import { createFacts, realDeps, externalFlags, githubFlags } from './facts.ts'

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
