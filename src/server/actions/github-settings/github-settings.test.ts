import type { GhRunner } from '../../inventory/github.ts'
import { realGit } from '../action-options.ts'
import { fixGithubSettings } from './github-settings.ts'

const repo = {
  allow_merge_commit: true,
  allow_rebase_merge: true,
  allow_squash_merge: true,
  archived: false,
  default_branch: 'master',
  delete_branch_on_merge: false,
  fork: false,
  name: 'lib',
  owner: { login: 'Owner' },
  private: false,
  pushed_at: '2024-01-01T00:00:00Z',
  security_and_analysis: { secret_scanning: { status: 'disabled' }, secret_scanning_push_protection: { status: 'disabled' } },
}

const fixedRepo = { ...repo, allow_merge_commit: false, delete_branch_on_merge: true, security_and_analysis: { secret_scanning: { status: 'enabled' }, secret_scanning_push_protection: { status: 'enabled' } } }

/** What goes on at GitHub */
interface Behavior {
  /** The repo as GitHub answers it before the PATCH, `missing` for a 404 */
  before?: Record<string, unknown> | 'missing'
  /** The repo as GitHub answers it after the PATCH, `missing` for a 404 */
  after?: Record<string, unknown> | 'missing'
  /** The outcome of the PATCH */
  patch?: { ok: boolean; stderr: string }
}

/**
 * A fake gh for the repo `Owner/lib`
 * @param behavior what GitHub does
 * @param behavior.after what GitHub answers once the PATCH said ok
 * @param behavior.before what GitHub answers before the PATCH, a 404 when undefined
 * @param behavior.patch the outcome of the PATCH
 * @returns the fake runner
 */
function fakeGh({ after = fixedRepo, before = repo, patch = { ok: true, stderr: '' } }: Behavior = {}) {
  let isPatched = false
  return vi.fn<GhRunner>(args => {
    const key = args.join(' ')
    if (key.startsWith('api --method PATCH repos/Owner/lib')) {
      isPatched = patch.ok
      return Promise.resolve({ ...patch, stdout: '' })
    }
    if (key !== 'api repos/Owner/lib') return Promise.resolve({ ok: false, stderr: `unexpected ${key}`, stdout: '' })
    const answer = isPatched ? after : before
    return Promise.resolve(answer === 'missing' ? { ok: false, stderr: 'gh: Not Found (HTTP 404)', stdout: '' } : { ok: true, stderr: '', stdout: JSON.stringify(answer) })
  })
}

/**
 * Run the fix on the repo `Owner/lib`
 * @param gh the fake gh
 * @returns the result
 */
function fix(gh: GhRunner) {
  return fixGithubSettings({ gh, git: realGit, name: 'lib', owner: 'Owner', target: import.meta.dirname })
}

describe(fixGithubSettings, () => {
  it('sets every setting that is off and reads the repo back', async () => {
    expect.hasAssertions()
    const gh = fakeGh()
    await expect(fix(gh)).resolves.toStrictEqual({
      message: 'set on Owner/lib: delete the branch of a pull request once it is merged, forbid the merge commits, squash or rebase remain, turn on the secret scanning and its push protection',
      ok: true,
    })
    expect(gh).toHaveBeenCalledWith(['api', '--method', 'PATCH', 'repos/Owner/lib', '-F', 'delete_branch_on_merge=true', '-F', 'allow_merge_commit=false', '-f', 'security_and_analysis[secret_scanning][status]=enabled', '-f', 'security_and_analysis[secret_scanning_push_protection][status]=enabled'])
  })

  it('only sets what is off', async () => {
    expect.hasAssertions()
    const gh = fakeGh({ after: fixedRepo, before: { ...fixedRepo, delete_branch_on_merge: false } })
    await expect(fix(gh)).resolves.toStrictEqual({ message: 'set on Owner/lib: delete the branch of a pull request once it is merged', ok: true })
    expect(gh).toHaveBeenCalledWith(['api', '--method', 'PATCH', 'repos/Owner/lib', '-F', 'delete_branch_on_merge=true'])
  })

  it('refuses a repo that is not on GitHub any more, was renamed, or is archived', async () => {
    expect.hasAssertions()
    await expect(fix(fakeGh({ before: 'missing' }))).resolves.toStrictEqual({ ok: false, reason: 'Owner/lib does not exist on GitHub any more' })
    await expect(fix(fakeGh({ before: { ...repo, name: 'other' } }))).resolves.toStrictEqual({ ok: false, reason: 'Owner/lib was renamed or moved to owner/other, scan again' })
    await expect(fix(fakeGh({ before: { ...repo, archived: true } }))).resolves.toStrictEqual({ ok: false, reason: 'Owner/lib is archived, GitHub does not let its settings change' })
  })

  it('refuses a repo that is fine, or whose settings GitHub does not show', async () => {
    expect.hasAssertions()
    const reason = 'Owner/lib has these settings already, or GitHub does not show them to you'
    await expect(fix(fakeGh({ before: fixedRepo }))).resolves.toStrictEqual({ ok: false, reason })
    await expect(fix(fakeGh({ before: { ...repo, delete_branch_on_merge: undefined } }))).resolves.toStrictEqual({ ok: false, reason })
  })

  it('shows why GitHub refused', async () => {
    expect.hasAssertions()
    await expect(fix(fakeGh({ patch: { ok: false, stderr: 'Must have admin rights\n' } }))).resolves.toStrictEqual({ ok: false, reason: 'GitHub refused to change the settings of Owner/lib: Must have admin rights' })
  })

  it('says so when GitHub said ok but a setting did not change', async () => {
    expect.hasAssertions()
    const stuck = { ...fixedRepo, allow_merge_commit: true, delete_branch_on_merge: false }
    await expect(fix(fakeGh({ after: stuck }))).resolves.toStrictEqual({
      ok: false,
      reason: 'GitHub said ok but Owner/lib still has 2 settings to fix, set them by hand: delete the branch of a pull request once it is merged, forbid the merge commits, squash or rebase remain',
    })
    await expect(fix(fakeGh({ after: { ...fixedRepo, allow_merge_commit: true } }))).resolves.toStrictEqual({ ok: false, reason: 'GitHub said ok but Owner/lib still has 1 setting to fix, set them by hand: forbid the merge commits, squash or rebase remain' })
  })

  it('keeps the first reading when GitHub cannot be read back', async () => {
    expect.hasAssertions()
    await expect(fix(fakeGh({ after: 'missing' }))).resolves.toMatchObject({ ok: false })
  })
})
