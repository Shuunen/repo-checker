import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { GhRunner } from './inventory/github.ts'
import { run } from './inventory/shell.ts'
import { packageJsonExists } from './rules/package/package-json.rule.ts'
import { archivedWithUnsavedWork } from './rules/sync/archived.rule.ts'
import { brokenClone } from './rules/sync/broken-clone.rule.ts'
import { notCloned } from './rules/sync/not-cloned.rule.ts'
import { scan } from './scan.ts'

const identity = ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false']
const rules = [notCloned, brokenClone, archivedWithUnsavedWork, packageJsonExists]
const apiRepo = (name: string, fields: Readonly<Record<string, unknown>> = {}) => ({ archived: false, default_branch: 'master', fork: false, has_pages: false, name, owner: { login: 'owner' }, private: false, pushed_at: '2026-01-01T00:00:00Z', stargazers_count: 0, ...fields })

/**
 * Run git in a fixture folder, failing the test when git fails
 * @param folder the folder
 * @param args the git arguments
 */
async function git(folder: string, ...args: readonly string[]) {
  const result = await run('git', [...identity, ...args], folder)
  if (!result.ok) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`)
}

/**
 * Clone the workspace origin, then point the clone's origin to a GitHub url, scans run without fetch
 * @param workspace the workspace
 * @param name the clone folder name
 * @param slug the GitHub `owner/name` of its origin
 * @returns the clone path
 */
async function cloneAs(workspace: string, name: string, slug: string) {
  await git(workspace, 'clone', '--quiet', 'origin.git', name)
  const folder = path.join(workspace, name)
  await git(folder, 'remote', 'set-url', 'origin', `git@github.com:${slug}.git`)
  return folder
}

/**
 * Create a workspace: an origin with one commit, clones of the owner's app (with an unpushed commit) and gone repos, a clone of another owner, a plain folder
 * @returns the workspace path
 */
async function makeWorkspace() {
  const workspace = await mkdtemp(path.join(tmpdir(), 'repo-check-scan-'))
  onTestFinished(() => rm(workspace, { force: true, recursive: true }))
  await git(workspace, 'init', '--quiet', '--bare', '--initial-branch=main', 'origin.git')
  await git(workspace, 'clone', '--quiet', 'origin.git', 'seed')
  await git(path.join(workspace, 'seed'), 'commit', '--quiet', '--allow-empty', '-m', 'init')
  await git(path.join(workspace, 'seed'), 'push', '--quiet', 'origin', 'main')
  await rm(path.join(workspace, 'seed'), { force: true, recursive: true })
  const app = await cloneAs(workspace, 'app', 'owner/app')
  await writeFile(path.join(app, 'package.json'), '{ "name": "app" }')
  await git(app, 'add', '.')
  await git(app, 'commit', '--quiet', '-m', 'local work')
  await cloneAs(workspace, 'gone', 'owner/gone')
  await cloneAs(workspace, 'lib', 'someone/lib')
  await mkdir(path.join(workspace, 'plain'))
  await rm(path.join(workspace, 'origin.git'), { force: true, recursive: true })
  return workspace
}

/**
 * A fake gh that answers known `gh api` calls, and fails like gh on anything else
 * @param answers the JSON to return, by joined arguments
 * @returns the fake runner
 */
function fakeGh(answers: Readonly<Record<string, unknown>>) {
  return vi.fn<GhRunner>(args => {
    const key = args.join(' ')
    return Promise.resolve(key in answers ? { ok: true, stderr: '', stdout: JSON.stringify(answers[key]) } : { ok: false, stderr: 'gh: Not Found (HTTP 404)', stdout: '' })
  })
}

const user = { 'api user': { login: 'owner' } }
const runs = (name: string) => `api repos/owner/${name}/actions/runs?branch=master&status=completed&exclude_pull_requests=true&per_page=1`
const commits = (name: string) => `api repos/owner/${name}/commits?author=owner&per_page=1`

/**
 * A fake gh that holds one call until released, then answers like `fakeGh`
 * @param answers the JSON to return, by joined arguments
 * @param held the joined arguments of the call to hold
 * @param released resolves when the held call may answer
 * @returns the fake runner
 */
function holdingGh(answers: Readonly<Record<string, unknown>>, held: string, released: Promise<undefined>) {
  const answer = fakeGh(answers)
  return vi.fn<GhRunner>(async args => {
    if (args.join(' ') === held) await released
    return answer(args)
  })
}

describe(scan, () => {
  it('checks every project of a folder against the owner repos', async () => {
    expect.hasAssertions()
    const gh = fakeGh({ ...user, 'api --paginate --slurp user/repos?affiliation=owner&per_page=100': [[apiRepo('app', { archived: true }), apiRepo('finga')]] })
    const seen: string[] = []
    const progress: string[] = []
    const target = await makeWorkspace()
    const { isSingle, owner, projects } = await scan({ gh, owner: undefined, rules, shouldFetch: false, target }, { onProgress: line => progress.push(line), onProject: result => seen.push(result.project.name) })
    expect({ isSingle, owner }).toStrictEqual({ isSingle: false, owner: 'owner' })
    expect(projects.map(({ findings, project }) => [project.name, findings.map(item => item.ruleId)])).toStrictEqual([
      ['app', ['archived-with-unsaved-work']],
      ['finga', ['not-cloned']],
      ['gone', ['broken-clone']],
      ['lib', []],
      ['plain', ['broken-clone']],
    ])
    expect(seen.toSorted()).toStrictEqual(['app', 'finga', 'gone', 'lib', 'plain'])
    expect(progress).toStrictEqual([`reading the local clones in ${target}`, 'listing the repos of owner on GitHub', 'reading the CI and the activity of the repos', 'checking 5 projects'])
    expect(projects.find(result => result.project.name === 'finga')?.outcomes).toStrictEqual([
      { ruleId: 'not-cloned', status: 'failed' },
      { ruleId: 'broken-clone', status: 'skipped' },
      { ruleId: 'archived-with-unsaved-work', status: 'skipped' },
    ])
  })

  it('checks the other projects while the forks are compared', async () => {
    expect.hasAssertions()
    const { promise: released, resolve: release } = Promise.withResolvers<undefined>()
    const gh = holdingGh({ ...user, 'api --paginate --slurp user/repos?affiliation=owner&per_page=100': [[apiRepo('finga'), apiRepo('fork', { fork: true })]] }, 'api repos/owner/fork', released)
    const target = await mkdtemp(path.join(tmpdir(), 'repo-check-scan-'))
    onTestFinished(() => rm(target, { force: true, recursive: true }))
    const seen: string[] = []
    const progress: string[] = []
    const { projects } = await scan(
      { gh, owner: undefined, rules, shouldFetch: false, target },
      {
        onProgress: line => progress.push(line),
        onProject: result => {
          seen.push(result.project.name)
          release(undefined)
        },
      },
    )
    expect(seen).toStrictEqual(['finga', 'fork'])
    expect(progress.slice(-2)).toStrictEqual(['checking 2 projects', 'comparing 1 fork with their parent'])
    expect(projects.map(result => result.project.github?.forkStatus?.failures.length)).toStrictEqual([undefined, 1])
  })

  it('fetches each usable clone right before its check, and marks the one whose fetch fails', async () => {
    expect.hasAssertions()
    vi.stubEnv('GIT_SSH_COMMAND', 'false')
    onTestFinished(() => {
      vi.unstubAllEnvs()
    })
    const gh = fakeGh({ ...user, 'api --paginate --slurp user/repos?affiliation=owner&per_page=100': [[apiRepo('app')]] })
    const progress: string[] = []
    const { projects } = await scan({ gh, owner: undefined, rules, shouldFetch: true, target: await makeWorkspace() }, { onProgress: line => progress.push(line) })
    const byName = new Map(projects.map(result => [result.project.name, result.project.local?.fetchFailed]))
    expect(byName.get('app')).toBe(true)
    expect(byName.get('plain')).toBe(false)
    expect(progress.at(-1)).toBe('checking 4 projects, each clone is fetched just before its check')
  })

  it('reads the open pull requests of the whole account with one search, a repo without any gets zeros', async () => {
    expect.hasAssertions()
    const search = 'api --paginate --slurp search/issues?q=user:owner+is:pr+is:open&per_page=100'
    const item = { repository_url: 'https://api.github.com/repos/owner/app', user: { login: 'renovate[bot]' } }
    const gh = fakeGh({ ...user, 'api --paginate --slurp user/repos?affiliation=owner&per_page=100': [[apiRepo('app'), apiRepo('finga')]], [search]: [{ items: [item] }] })
    const { projects } = await scan({ gh, owner: undefined, rules, shouldFetch: false, target: await makeWorkspace() })
    const counts = new Map(projects.map(result => [result.project.name, result.project.github?.pullRequests]))
    expect(counts.get('app')).toStrictEqual({ other: 0, renovate: 1 })
    expect(counts.get('finga')).toStrictEqual({ other: 0, renovate: 0 })
  })

  it('reads the CI of the live repos, and the last own commit of those that could be archived', async () => {
    expect.hasAssertions()
    const gh = fakeGh({
      ...user,
      'api --paginate --slurp user/repos?affiliation=owner&per_page=100': [[apiRepo('app', { stargazers_count: 3 }), apiRepo('finga'), apiRepo('old', { archived: true }), apiRepo('forked', { fork: true })]],
      [commits('finga')]: [{ commit: { committer: { date: '2024-01-01T00:00:00Z' } } }],
      [runs('app')]: { workflow_runs: [{ conclusion: 'success' }] },
      [runs('finga')]: { workflow_runs: [{ conclusion: 'failure' }] },
    })
    const { projects } = await scan({ gh, owner: undefined, rules, shouldFetch: false, target: await makeWorkspace() })
    const repos = new Map(projects.map(result => [result.project.name, result.project.github]))
    expect(repos.get('app')).toMatchObject({ ci: 'passing', lastOwnCommitAt: undefined })
    expect(repos.get('finga')).toMatchObject({ ci: 'failing', lastOwnCommitAt: '2024-01-01T00:00:00Z' })
    expect(repos.get('old')?.ci).toBeUndefined()
    expect(gh.mock.calls.map(([args]) => args.join(' '))).not.toContain(commits('app'))
  })

  it('goes on without the pull requests when the search fails', async () => {
    expect.hasAssertions()
    const gh = fakeGh({ ...user, 'api --paginate --slurp user/repos?affiliation=owner&per_page=100': [[apiRepo('app')]] })
    const { projects } = await scan({ gh, owner: undefined, rules, shouldFetch: false, target: await makeWorkspace() })
    expect(projects.find(result => result.project.name === 'app')?.project.github?.pullRequests).toBeUndefined()
  })

  it('checks only the target in single project mode, against the owner of its origin', async () => {
    expect.hasAssertions()
    const gh = fakeGh({ ...user, 'api repos/owner/app': apiRepo('app', { archived: true }) })
    const { isSingle, owner, projects } = await scan({ gh, owner: undefined, rules, shouldFetch: false, target: path.join(await makeWorkspace(), 'app') })
    expect({ isSingle, owner }).toStrictEqual({ isSingle: true, owner: 'owner' })
    expect(projects.map(({ findings, project }) => [project.name, findings.map(item => item.ruleId)])).toStrictEqual([['app', ['archived-with-unsaved-work']]])
  })

  it('reports a single project whose repo is gone as a broken clone', async () => {
    expect.hasAssertions()
    const { projects } = await scan({ gh: fakeGh(user), owner: undefined, rules, shouldFetch: false, target: path.join(await makeWorkspace(), 'gone') })
    expect(projects.map(({ findings }) => findings.map(item => item.messageId))).toStrictEqual([['originNotFound']])
  })

  it('asks nothing to GitHub for a single project without GitHub origin', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    await git(workspace, 'init', '--quiet', 'local-only')
    await git(path.join(workspace, 'local-only'), 'remote', 'add', 'origin', '/tmp/somewhere.git')
    const gh = fakeGh(user)
    const { projects } = await scan({ gh, owner: 'owner', rules, shouldFetch: false, target: path.join(workspace, 'local-only') })
    expect(projects).toMatchObject([{ findings: [], project: { isOtherOwner: true, name: 'local-only' } }])
    expect(gh.mock.calls.map(([args]) => args.join(' '))).toStrictEqual(['api user'])
  })
})
