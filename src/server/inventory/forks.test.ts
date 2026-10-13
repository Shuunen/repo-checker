import type { GithubRepo } from '../../shared/project.ts'
import { addForkStatus, readForkStatus } from './forks.ts'
import type { GhRunner } from './github.ts'

const fork: GithubRepo = { defaultBranch: 'main', forkStatus: undefined, isArchived: false, isFork: true, isPrivate: false, name: 'lib', owner: 'me', pushedAt: '2026-01-01T00:00:00Z', slug: 'me/lib' }
const details = { 'api repos/me/lib': { parent: { default_branch: 'main', full_name: 'them/lib' } } }
const compare = (branch: string) => `api repos/them/lib/compare/main...me:${encodeURIComponent(branch)}`
const pulls = (branch: string) => `api repos/them/lib/pulls?state=open&per_page=100&head=${encodeURIComponent(`me:${branch}`)}`
const branches = (...names: readonly string[]) => ({ 'api --paginate --slurp repos/me/lib/branches?per_page=100': [names.map(name => ({ name }))] })

/**
 * A fake gh that answers known `gh api` calls with recorded JSON, and fails like gh on anything else
 * @param answers the JSON to return, by joined arguments
 * @returns the fake runner
 */
function fakeGh(answers: Readonly<Record<string, unknown>>) {
  return vi.fn<GhRunner>(args => {
    const key = args.join(' ')
    return Promise.resolve(key in answers ? { ok: true, stderr: '', stdout: JSON.stringify(answers[key]) } : { ok: false, stderr: 'gh: Not Found (HTTP 404)\n', stdout: '' })
  })
}

describe('fork status', () => {
  it('compares every branch with the parent and counts the open pull requests', async () => {
    expect.hasAssertions()
    const gh = fakeGh({ ...details, ...branches('main', 'feature/i18n'), [compare('main')]: { ahead_by: 0 }, [compare('feature/i18n')]: { ahead_by: 2 }, [pulls('main')]: [], [pulls('feature/i18n')]: [{ number: 1 }] })
    await expect(readForkStatus(gh, fork)).resolves.toStrictEqual({
      branches: [
        { aheadBy: 0, name: 'main' },
        { aheadBy: 2, name: 'feature/i18n' },
      ],
      failures: [],
      openPullRequests: 1,
      parent: 'them/lib',
    })
  })

  it('keeps every failed call, like a comparison without common ancestor', async () => {
    expect.hasAssertions()
    const gh = fakeGh({ ...details, ...branches('master'), [pulls('master')]: [] })
    await expect(readForkStatus(gh, fork)).resolves.toStrictEqual({ branches: [], failures: ['repos/them/lib/compare/main...me:master: gh: Not Found (HTTP 404)'], openPullRequests: 0, parent: 'them/lib' })
  })

  it('keeps a failed pull request lookup, so the fork cannot be verified', async () => {
    expect.hasAssertions()
    const gh = fakeGh({ ...details, ...branches('master'), [compare('master')]: { ahead_by: 0 } })
    await expect(readForkStatus(gh, fork)).resolves.toMatchObject({ branches: [{ aheadBy: 0, name: 'master' }], failures: [expect.stringContaining('pulls?state=open')], openPullRequests: 0 })
  })

  it('cannot go further when the fork details fail', async () => {
    expect.hasAssertions()
    await expect(readForkStatus(fakeGh({}), fork)).resolves.toMatchObject({ failures: ['repos/me/lib: gh: Not Found (HTTP 404)'], parent: '' })
  })

  it('cannot go further when the repo has no parent', async () => {
    expect.hasAssertions()
    await expect(readForkStatus(fakeGh({ 'api repos/me/lib': {} }), fork)).resolves.toMatchObject({ failures: ['repos/me/lib: no parent repo'], parent: '' })
  })

  it('cannot go further when the branches cannot be listed', async () => {
    expect.hasAssertions()
    await expect(readForkStatus(fakeGh(details), fork)).resolves.toMatchObject({ failures: ['repos/me/lib/branches?per_page=100: gh: Not Found (HTTP 404)'], parent: 'them/lib' })
  })

  it('adds the status to a fork project', async () => {
    expect.hasAssertions()
    const project = await addForkStatus(fakeGh({ ...details, ...branches() }), { github: fork, isOtherOwner: false, local: undefined, name: 'lib' })
    expect(project.github?.forkStatus).toStrictEqual({ branches: [], failures: [], openPullRequests: 0, parent: 'them/lib' })
  })

  it.each([
    ['a repo that is not a fork', { ...fork, isFork: false }],
    ['a clone without repo', undefined],
  ])('leaves %s as it is', async (_name, github) => {
    expect.hasAssertions()
    const gh = fakeGh({})
    const project = { github, isOtherOwner: false, local: undefined, name: 'own' }
    await expect(addForkStatus(gh, project)).resolves.toBe(project)
    expect(gh).not.toHaveBeenCalled()
  })
})
