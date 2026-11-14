import type { RepoSettings } from '../../../shared/project.ts'
import { testProjectRule } from '../../test/rule-tester.ts'
import { repoDeleteBranchOnMerge, repoNoMergeCommit, repoSecretScanning } from './repo-settings.rule.ts'

const fine: RepoSettings = { allowMergeCommit: false, allowRebaseMerge: true, allowSquashMerge: true, deleteBranchOnMerge: true, hasPushProtection: true, hasSecretScanning: true }
const fix = [['fix-github-settings']] as never

/**
 * The GitHub fields of a repo whose settings differ from a repo that is fine
 * @param settings what differs
 * @returns the fields to give to the case
 */
function repoWith(settings: Partial<RepoSettings>) {
  return { github: { settings: { ...fine, ...settings } }, local: {} }
}

testProjectRule(repoDeleteBranchOnMerge, {
  invalid: [{ actions: fix, errors: ['missing'], ...repoWith({ deleteBranchOnMerge: false }), name: 'the merged branches are kept' }],
  valid: [
    { ...repoWith({}), name: 'deleted once merged' },
    { github: {}, local: {}, name: 'settings not read' },
    { ...repoWith({ deleteBranchOnMerge: false }), github: { isArchived: true, settings: { ...fine, deleteBranchOnMerge: false } }, name: 'an archived repo' },
    { ...repoWith({ deleteBranchOnMerge: false }), isOtherOwner: true, name: 'a repo of someone else' },
  ],
})

testProjectRule(repoNoMergeCommit, {
  invalid: [{ actions: fix, errors: ['missing'], ...repoWith({ allowMergeCommit: true }), name: 'merge commits are accepted' }],
  valid: [
    { ...repoWith({}), name: 'no merge commit' },
    { ...repoWith({ allowMergeCommit: true, allowRebaseMerge: false, allowSquashMerge: false }), name: 'merge commit is the only way to merge' },
  ],
})

testProjectRule(repoSecretScanning, {
  invalid: [
    { actions: fix, errors: ['missing'], ...repoWith({ hasSecretScanning: false }), name: 'no secret scanning' },
    { actions: fix, errors: ['missing'], ...repoWith({ hasPushProtection: false }), name: 'no push protection' },
  ],
  valid: [
    { ...repoWith({}), name: 'both on' },
    { github: { isPrivate: true, settings: { ...fine, hasSecretScanning: false } }, local: {}, name: 'a private repo' },
  ],
})
