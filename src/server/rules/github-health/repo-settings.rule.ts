import type { GithubRepo } from '../../../shared/project.ts'
import { type SettingId, settingFixes } from '../../../shared/repo-settings.ts'
import { requireRepoField } from '../presentation/github-metadata.utils.ts'

/**
 * Make the test of a setting: the repo needs it fixed
 * @param id the setting
 * @returns the test
 */
function needs(id: SettingId) {
  return (repo: Readonly<GithubRepo>) => settingFixes(repo).some(fix => fix.id === id)
}

export const repoDeleteBranchOnMerge = requireRepoField({
  actions: ['fix-github-settings'],
  id: 'repo-delete-branch-on-merge',
  isMissing: needs('delete-branch-on-merge'),
  message: 'the repo keeps the branch of a pull request once it is merged, GitHub can delete it',
  severity: 'info',
})

export const repoNoMergeCommit = requireRepoField({
  actions: ['fix-github-settings'],
  id: 'repo-no-merge-commit',
  isMissing: needs('no-merge-commit'),
  message: 'the repo accepts merge commits, squash or rebase keep the history flat',
  severity: 'info',
})

export const repoSecretScanning = requireRepoField({
  actions: ['fix-github-settings'],
  id: 'repo-secret-scanning',
  isMissing: needs('secret-scanning'),
  message: 'the repo has no secret scanning or no push protection on GitHub, free on a public repo',
  publicOnly: true,
  severity: 'info',
})
