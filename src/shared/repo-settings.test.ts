import type { RepoSettings } from './project.ts'
import { settingFixes } from './repo-settings.ts'

const fine: RepoSettings = { allowMergeCommit: false, allowRebaseMerge: true, allowSquashMerge: true, deleteBranchOnMerge: true, hasPushProtection: true, hasSecretScanning: true }

/**
 * The ids of the settings to fix for a repo
 * @param settings what differs from a repo that is fine
 * @param isPrivate true for a private repo
 * @returns the ids
 */
function idsOf(settings: Partial<RepoSettings> | undefined, isPrivate = false) {
  return settingFixes({ isPrivate, settings: settings === undefined ? undefined : { ...fine, ...settings } }).map(fix => fix.id)
}

describe(settingFixes, () => {
  it('wants nothing for a repo that is fine, and for a repo whose settings are unknown', () => {
    expect.hasAssertions()
    expect(idsOf({})).toStrictEqual([])
    expect(idsOf(undefined)).toStrictEqual([])
  })

  it('wants the branches deleted once merged', () => {
    expect.hasAssertions()
    expect(idsOf({ deleteBranchOnMerge: false })).toStrictEqual(['delete-branch-on-merge'])
  })

  it('wants no merge commit when squash or rebase can replace it, and keeps it when it is the only way to merge', () => {
    expect.hasAssertions()
    expect(idsOf({ allowMergeCommit: true })).toStrictEqual(['no-merge-commit'])
    expect(idsOf({ allowMergeCommit: true, allowRebaseMerge: false })).toStrictEqual(['no-merge-commit'])
    expect(idsOf({ allowMergeCommit: true, allowRebaseMerge: false, allowSquashMerge: false })).toStrictEqual([])
  })

  it('wants the secret scanning and its push protection on a public repo only, when GitHub says they are off', () => {
    expect.hasAssertions()
    expect(idsOf({ hasSecretScanning: false })).toStrictEqual(['secret-scanning'])
    expect(idsOf({ hasPushProtection: false })).toStrictEqual(['secret-scanning'])
    expect(idsOf({ hasPushProtection: undefined, hasSecretScanning: undefined })).toStrictEqual([])
    expect(idsOf({ hasSecretScanning: false }, true)).toStrictEqual([])
  })

  it('gives the gh arguments of each setting, in a stable order', () => {
    expect.hasAssertions()
    const fixes = settingFixes({ isPrivate: false, settings: { allowMergeCommit: true, allowRebaseMerge: true, allowSquashMerge: true, deleteBranchOnMerge: false, hasSecretScanning: false } })
    expect(fixes.map(fix => fix.id)).toStrictEqual(['delete-branch-on-merge', 'no-merge-commit', 'secret-scanning'])
    expect(fixes.flatMap(fix => fix.args)).toContain('allow_merge_commit=false')
  })
})
