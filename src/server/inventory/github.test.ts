import { type GhRunner, getLogin, getRepo, ghCli, listRepos } from './github.ts'

/**
 * Build an API repo like the GitHub REST API returns it, with only the fields the scan reads
 * @param name the repo name
 * @param fields the fields to change
 * @returns the API repo
 */
function apiRepo(name: string, fields: Readonly<Record<string, unknown>> = {}) {
  return { archived: false, fork: false, name, owner: { login: 'Shuunen' }, private: false, pushed_at: '2026-01-01T00:00:00Z', ...fields }
}

/**
 * A fake gh that answers known `gh api` calls with recorded JSON, and fails like gh on anything else
 * @param answers the JSON to return, by joined arguments
 * @returns the fake runner, it records its calls
 */
function fakeGh(answers: Readonly<Record<string, unknown>>) {
  return vi.fn<GhRunner>(args => {
    const key = args.join(' ')
    return Promise.resolve(key in answers ? { ok: true, stderr: '', stdout: JSON.stringify(answers[key]) } : { ok: false, stderr: 'gh: Not Found (HTTP 404)\n', stdout: '' })
  })
}

describe('github inventory', () => {
  it('gets the authenticated login', async () => {
    expect.hasAssertions()
    await expect(getLogin(fakeGh({ 'api user': { login: 'Shuunen' } }))).resolves.toBe('Shuunen')
  })

  it('lists every page of the own repos, private ones included', async () => {
    expect.hasAssertions()
    const gh = fakeGh({ 'api --paginate --slurp user/repos?affiliation=owner&per_page=100': [[apiRepo('Jozzo', { archived: true })], [apiRepo('secret', { private: true }), apiRepo('fork', { fork: true })]] })
    const repos = await listRepos(gh, 'shuunen', 'Shuunen')
    expect(repos.map(repo => [repo.slug, repo.isArchived, repo.isPrivate, repo.isFork])).toStrictEqual([
      ['shuunen/jozzo', true, false, false],
      ['shuunen/secret', false, true, false],
      ['shuunen/fork', false, false, true],
    ])
    expect(repos[0]).toMatchObject({ name: 'Jozzo', owner: 'Shuunen', pushedAt: '2026-01-01T00:00:00Z' })
  })

  it('lists the public repos of another owner', async () => {
    expect.hasAssertions()
    const gh = fakeGh({ 'api --paginate --slurp users/someone/repos?per_page=100': [[apiRepo('lib', { owner: { login: 'someone' } })]] })
    await expect(listRepos(gh, 'someone', 'Shuunen')).resolves.toMatchObject([{ slug: 'someone/lib' }])
  })

  it('gets one repo, undefined when it does not exist', async () => {
    expect.hasAssertions()
    const gh = fakeGh({ 'api repos/shuunen/app': apiRepo('app') })
    await expect(getRepo(gh, 'shuunen/app')).resolves.toMatchObject({ slug: 'shuunen/app' })
    await expect(getRepo(gh, 'shuunen/gone')).resolves.toBeUndefined()
  })

  it('fails to get one repo for another reason than a 404', async () => {
    expect.hasAssertions()
    const gh = vi.fn<GhRunner>(() => Promise.resolve({ ok: false, stderr: 'gh: Bad credentials (HTTP 401)\n', stdout: '' }))
    await expect(getRepo(gh, 'shuunen/app')).rejects.toThrow('gh api repos/shuunen/app failed: gh: Bad credentials (HTTP 401)')
  })

  it('fails with the gh error', async () => {
    expect.hasAssertions()
    await expect(getLogin(fakeGh({}))).rejects.toThrow('gh api user failed: gh: Not Found (HTTP 404)')
  })

  it('runs the real gh binary', async () => {
    expect.hasAssertions()
    await expect(ghCli(['--version'])).resolves.toMatchObject({ ok: true, stdout: expect.stringContaining('gh version') })
  })
})
