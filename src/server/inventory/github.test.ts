import { type GhRunner, getLogin, getRemainingCalls, getRepo, ghCli, listPullRequests, listRepos, readCi, readLastOwnCommit } from './github.ts'

/**
 * A result of the search of open pull requests
 * @param repo the repo name
 * @param login the author of the pull request
 * @returns the result
 */
function item(repo: string, login: string) {
  return { repository_url: `https://api.github.com/repos/Shuunen/${repo}`, user: { login } }
}

/**
 * Build an API repo like the GitHub REST API returns it, with only the fields the scan reads
 * @param name the repo name
 * @param fields the fields to change
 * @returns the API repo
 */
function apiRepo(name: string, fields: Readonly<Record<string, unknown>> = {}) {
  return {
    archived: false,
    default_branch: 'master',
    description: 'a repo',
    fork: false,
    has_pages: true,
    homepage: 'https://example.com',
    license: { key: 'gpl-3.0' },
    name,
    open_issues_count: 4,
    owner: { login: 'Shuunen' },
    private: false,
    pushed_at: '2026-01-01T00:00:00Z',
    stargazers_count: 7,
    topics: ['tool'],
    ...fields,
  }
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
    expect(repos[0]).toMatchObject({ defaultBranch: 'master', description: 'a repo', hasLicense: true, hasPages: true, homepage: 'https://example.com', name: 'Jozzo', openItems: 4, owner: 'Shuunen', pushedAt: '2026-01-01T00:00:00Z', stars: 7, topics: ['tool'] })
  })

  it('reads a repo without license, description, homepage or topics, as GitHub sends it', async () => {
    expect.hasAssertions()
    const gh = fakeGh({ 'api repos/shuunen/bare': apiRepo('bare', { description: undefined, homepage: '', license: undefined, topics: undefined }) })
    await expect(getRepo(gh, 'shuunen/bare')).resolves.toMatchObject({ description: undefined, hasLicense: false, homepage: undefined, topics: [] })
  })

  it('counts the open pull requests per repo from one search, Renovate apart from the others', async () => {
    expect.hasAssertions()
    const gh = fakeGh({ 'api --paginate --slurp search/issues?q=user:Shuunen+is:pr+is:open&per_page=100': [{ items: [item('App', 'renovate[bot]'), item('App', 'renovate[bot]'), item('App', 'Shuunen')] }, { items: [item('lib', 'imgbot[bot]'), item('lib', 'renovate-bot')] }] })
    await expect(listPullRequests(gh, 'Shuunen')).resolves.toStrictEqual(
      new Map([
        ['shuunen/app', { other: 1, renovate: 2 }],
        ['shuunen/lib', { other: 1, renovate: 1 }],
      ]),
    )
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

describe(getRemainingCalls, () => {
  it.each([
    ['the calls left', { ok: true, stderr: '', stdout: '4980\n' }, 4980],
    ['nothing when gh fails', { ok: false, stderr: 'no network', stdout: '' }, undefined],
    ['nothing when gh does not answer a number', { ok: true, stderr: '', stdout: 'null\n' }, undefined],
  ])('gives %s', async (_name, answer, expected) => {
    expect.hasAssertions()
    const gh = vi.fn<GhRunner>(() => Promise.resolve(answer))
    await expect(getRemainingCalls(gh)).resolves.toBe(expected)
    expect(gh).toHaveBeenCalledWith(['api', 'rate_limit', '--jq', '.resources.core.remaining'])
  })
})

const repo = { defaultBranch: 'master', name: 'app', owner: 'Shuunen' }
const runs = 'api repos/Shuunen/app/actions/runs?branch=master&status=completed&exclude_pull_requests=true&per_page=1'
const commits = 'api repos/Shuunen/app/commits?author=Shuunen&per_page=1'

describe(readCi, () => {
  it.each([
    ['failing for a failure', { workflow_runs: [{ conclusion: 'failure' }] }, 'failing'],
    ['failing for a timeout', { workflow_runs: [{ conclusion: 'timed_out' }] }, 'failing'],
    ['passing for a success', { workflow_runs: [{ conclusion: 'success' }] }, 'passing'],
    ['passing for a cancelled run', { workflow_runs: [{ conclusion: 'cancelled' }] }, 'passing'],
    ['none without any run', { workflow_runs: [] }, 'none'],
    ['nothing for an answer that is not the list of runs', [[]], undefined],
  ])('is %s', async (_name, answer, expected) => {
    expect.hasAssertions()
    await expect(readCi(fakeGh({ [runs]: answer }), repo)).resolves.toBe(expected)
  })

  it('is nothing when GitHub refuses, like on a repo with the actions off', async () => {
    expect.hasAssertions()
    await expect(readCi(fakeGh({}), repo)).resolves.toBeUndefined()
  })
})

describe(readLastOwnCommit, () => {
  it('gives the date of the last commit of the account', async () => {
    expect.hasAssertions()
    await expect(readLastOwnCommit(fakeGh({ [commits]: [{ commit: { committer: { date: '2024-01-01T00:00:00Z' } } }] }), repo, 'Shuunen')).resolves.toBe('2024-01-01T00:00:00Z')
  })

  it('gives never when the account never committed', async () => {
    expect.hasAssertions()
    await expect(readLastOwnCommit(fakeGh({ [commits]: [] }), repo, 'Shuunen')).resolves.toBe('never')
  })

  it.each([
    ['GitHub refuses, like on an empty repo', {}],
    ['the answer is not a list of commits', { [commits]: { message: 'nope' } }],
  ])('gives nothing when %s', async (_name, answers) => {
    expect.hasAssertions()
    await expect(readLastOwnCommit(fakeGh(answers), repo, 'Shuunen')).resolves.toBeUndefined()
  })
})
