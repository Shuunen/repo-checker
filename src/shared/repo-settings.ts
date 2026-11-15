/**
 * The GitHub settings the checks want on a repo, and how to set them: one list, read by the rules, the action that sets them and the dialog that asks.
 * @module
 */
import type { GithubRepo } from './project.ts'

/** The settings a check can want */
export type SettingId = 'delete-branch-on-merge' | 'no-merge-commit' | 'secret-scanning'

/** One setting that is not what it should be, with what sets it */
export interface SettingFix {
  /** The `gh api` arguments that set it */
  args: string[]
  /** The setting */
  id: SettingId
  /** What setting it does, to tell the user */
  label: string
}

/**
 * List the settings of a repo that are not what the checks want: the branches deleted once merged, no merge commit while another way to merge is left, and the secret scanning with its push protection on a public repo. A setting GitHub did not show is left alone
 * @param repo the repo
 * @param repo.isPrivate true for a private repo
 * @param repo.settings the settings of the repo, undefined when they are not known
 * @returns the settings to set, empty when the repo is fine or its settings are unknown
 * @example settingFixes({ isPrivate: false, settings: { allowMergeCommit: false, allowRebaseMerge: true, allowSquashMerge: true, deleteBranchOnMerge: false } }) // [{ id: 'delete-branch-on-merge', ... }]
 */
export function settingFixes({ isPrivate, settings }: Readonly<Pick<GithubRepo, 'isPrivate' | 'settings'>>): SettingFix[] {
  if (settings === undefined) return []
  const fixes: SettingFix[] = []
  if (!settings.deleteBranchOnMerge) fixes.push({ args: ['-F', 'delete_branch_on_merge=true'], id: 'delete-branch-on-merge', label: 'delete the branch of a pull request once it is merged' })
  if (settings.allowMergeCommit && (settings.allowSquashMerge || settings.allowRebaseMerge)) fixes.push({ args: ['-F', 'allow_merge_commit=false'], id: 'no-merge-commit', label: 'forbid the merge commits, squash or rebase remain' })
  if (!isPrivate && (settings.hasSecretScanning === false || settings.hasPushProtection === false))
    fixes.push({ args: ['-f', 'security_and_analysis[secret_scanning][status]=enabled', '-f', 'security_and_analysis[secret_scanning_push_protection][status]=enabled'], id: 'secret-scanning', label: 'turn on the secret scanning and its push protection' })
  return fixes
}
