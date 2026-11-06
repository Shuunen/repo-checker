import { startServer } from './serve.ts'
import { createRegistry, realRegistryDeps, type RegistryDeps } from './registry.ts'

/**
 * Build a fake registry
 * @param manifests the manifest of each package, by name, a missing one fails like a 404
 * @param advisories the answer of the bulk endpoint, `failing` to make it fail
 * @returns the dependencies, with the clock and the calls
 */
function fakeRegistry(manifests: Readonly<Record<string, unknown>>, advisories: Readonly<Record<string, unknown[]>> | 'failing' = {}) {
  const clock = { now: 0 }
  const fetchJson = vi.fn<RegistryDeps['fetchJson']>(url => {
    if (url.endsWith('/security/advisories/bulk')) return advisories === 'failing' ? Promise.reject(new Error('HTTP 500')) : Promise.resolve(advisories)
    const name = decodeURIComponent(url.replace('https://registry.npmjs.org/', '').replace('/latest', ''))
    return name in manifests ? Promise.resolve(manifests[name]) : Promise.reject(new Error('HTTP 404'))
  })
  return { clock, deps: { fetchJson, now: () => clock.now }, fetchJson }
}

const advisory = { severity: 'high', title: 'Prototype pollution', url: 'https://github.com/advisories/GHSA-x' }

describe(createRegistry, () => {
  it('gives the latest version and the deprecation of each dependency and of the package manager, with their advisories', async () => {
    expect.hasAssertions()
    const { deps } = fakeRegistry({ '@scope/old': { deprecated: 'use new', version: '2.0.0' }, lodash: { version: '4.18.0' }, pnpm: { version: '12.10.0' } }, { lodash: [advisory], stranger: [advisory] })
    const facts = await createRegistry(deps).factsFor({ dependencies: { lodash: '~4.17.0' }, devDependencies: { '@scope/old': '^1.0.0', lodash: '~4.17.0' }, packageManager: 'pnpm@12.9.1' })
    expect(facts?.packages).toStrictEqual({ '@scope/old': { deprecated: 'use new', latest: '2.0.0' }, lodash: { latest: '4.18.0' }, pnpm: { latest: '12.10.0' } })
    expect(facts?.advisories).toStrictEqual({ 'lodash@4.17.0': [advisory] })
  })

  it('asks the advisories once for the versions of the project, scoped names are encoded', async () => {
    expect.hasAssertions()
    const { deps, fetchJson } = fakeRegistry({ '@scope/old': { version: '2.0.0' }, lodash: { version: '4.18.0' } })
    await createRegistry(deps).factsFor({ dependencies: { lodash: '~4.17.0' }, devDependencies: { '@scope/old': '^1.0.0', lodash: '4.16.0' } })
    expect(fetchJson.mock.calls.map(([url]) => url)).toContain('https://registry.npmjs.org/@scope%2Fold/latest')
    const bulk = fetchJson.mock.calls.find(([url]) => url.endsWith('/bulk'))
    expect(JSON.parse(String(bulk?.[1]?.body))).toStrictEqual({ '@scope/old': ['1.0.0'], lodash: ['4.17.0', '4.16.0'] })
  })

  it('leaves a package out when the registry does not know it, and the advisories when their call fails', async () => {
    expect.hasAssertions()
    const { deps } = fakeRegistry({ lodash: { version: '4.18.0' } }, 'failing')
    const facts = await createRegistry(deps).factsFor({ dependencies: { lodash: '~4.17.0', unknown: '1.0.0' } })
    expect(facts).toStrictEqual({ packages: { lodash: { latest: '4.18.0' } } })
  })

  it('knows nothing when the registry cannot be reached, or when there is nothing to ask', async () => {
    expect.hasAssertions()
    const { deps } = fakeRegistry({})
    const registry = createRegistry(deps)
    await expect(registry.factsFor({ dependencies: { lodash: '~4.17.0' } })).resolves.toBeUndefined()
    await expect(registry.factsFor({ dependencies: { local: 'workspace:*' } })).resolves.toBeUndefined()
    await expect(registry.factsFor(undefined)).resolves.toBeUndefined()
  })

  it('asks no advisory for a project that only pins a package manager', async () => {
    expect.hasAssertions()
    const { deps, fetchJson } = fakeRegistry({ pnpm: { version: '12.10.0' } })
    await expect(createRegistry(deps).factsFor({ packageManager: 'pnpm@12.9.1' })).resolves.toStrictEqual({ advisories: {}, packages: { pnpm: { latest: '12.10.0' } } })
    expect(fetchJson.mock.calls.map(([url]) => url)).toStrictEqual(['https://registry.npmjs.org/pnpm/latest'])
  })

  it('asks a package once an hour, whatever the number of projects', async () => {
    expect.hasAssertions()
    const { clock, deps, fetchJson } = fakeRegistry({ lodash: { version: '4.18.0' } })
    const registry = createRegistry(deps)
    const pkg = { dependencies: { lodash: '~4.17.0' } }
    await Promise.all([registry.factsFor(pkg), registry.factsFor(pkg)])
    const asked = () => fetchJson.mock.calls.filter(([url]) => url.endsWith('/latest')).length
    expect(asked()).toBe(1)
    clock.now = 3_599_000
    await registry.factsFor(pkg)
    expect(asked()).toBe(1)
    clock.now = 3_600_000
    await registry.factsFor(pkg)
    expect(asked()).toBe(2)
  })
})

describe('real registry dependencies', () => {
  it('reads the json of a url and fails on an error status', async () => {
    expect.hasAssertions()
    const server = await startServer(request => Response.json({ hello: 'world' }, { status: Number(new URL(request.url).pathname.slice(1)) }), 0)
    onTestFinished(() => server.close())
    await expect(realRegistryDeps.fetchJson(`${server.url}/200`)).resolves.toStrictEqual({ hello: 'world' })
    await expect(realRegistryDeps.fetchJson(`${server.url}/404`)).rejects.toThrow('HTTP 404')
  })

  it('gives the current time', () => {
    expect.hasAssertions()
    expect(realRegistryDeps.now()).toBeGreaterThan(0)
  })
})
