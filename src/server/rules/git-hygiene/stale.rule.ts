import { isOlderThan, monthsAgo } from '../../../shared/age.ts'
import { plural } from '../../../shared/text.ts'
import { defineProjectRule } from '../../engine/define-project-rule.ts'
import { cloneOf, hasFreshRemote, isCheckableClone } from './git-hygiene.utils.ts'

/** A branch nobody committed to for this many months is stale */
const staleBranchMonths = 6

/** A tag that is this many months old, with commits since, asks for a new release */
const staleTagMonths = 12

/** The bots open branches that live as long as their pull request, `open-renovate-pr` is the one to say it */
const botBranch = /^(?:dependabot|renovate)\//u

/** A branch as the stale checks see it */
interface Candidate {
  /** True when it is merged into the default branch */
  isMerged: boolean
  /** When its last commit was made, empty when unknown */
  lastCommitAt: string
  /** Its name */
  name: string
}

/**
 * Tell if a branch is untouched for long, and not merged, which `isMerged` already says
 * @param branch the branch
 * @param branch.isMerged true when it is merged into the default branch
 * @param branch.lastCommitAt when its last commit was made
 * @returns true when its last commit is old enough
 */
function isUntouched({ isMerged, lastCommitAt }: Readonly<Candidate>) {
  return !isMerged && lastCommitAt !== '' && isOlderThan(lastCommitAt, staleBranchMonths)
}

/**
 * List the branches with their age, like `old (8 months)`
 * @param branches the branches
 * @returns the text
 */
function withAge(branches: readonly Candidate[]) {
  return branches.map(branch => `${branch.name} (${plural(monthsAgo(branch.lastCommitAt), 'month')})`).join(', ')
}

export const staleLocalBranch = defineProjectRule({
  appliesTo: isCheckableClone,
  check(context) {
    const { currentBranch, branches } = cloneOf(context)
    const defaultBranch = context.project.github?.defaultBranch
    const others: Candidate[] = branches.filter(branch => branch.name !== currentBranch && branch.name !== defaultBranch).map(branch => ({ isMerged: branch.isMerged === true, lastCommitAt: branch.lastCommitAt ?? '', name: branch.name }))
    const merged = others.filter(branch => branch.isMerged)
    const untouched = others.filter(branch => isUntouched(branch))
    if (merged.length > 0) context.report({ data: { branches: merged.map(branch => branch.name).join(', ') }, messageId: 'merged' })
    if (untouched.length > 0) context.report({ data: { branches: withAge(untouched), months: staleBranchMonths }, messageId: 'untouched' })
  },
  meta: {
    id: 'stale-local-branch',
    messages: { merged: 'local branches already merged into the default branch: {{branches}}', untouched: 'local branches untouched for {{months}} months or more, not merged: {{branches}}' },
    severity: 'info',
  },
})

export const staleRemoteBranch = defineProjectRule({
  appliesTo: hasFreshRemote,
  check(context) {
    const { remoteBranches = [] } = cloneOf(context)
    const defaultBranch = context.project.github?.defaultBranch
    const others = remoteBranches.filter(branch => branch.name !== defaultBranch)
    const merged = others.filter(branch => branch.isMerged)
    const untouched = others.filter(branch => isUntouched(branch) && !botBranch.test(branch.name))
    if (merged.length > 0) context.report({ data: { branches: merged.map(branch => branch.name).join(', ') }, messageId: 'merged' })
    if (untouched.length > 0) context.report({ data: { branches: withAge(untouched), months: staleBranchMonths }, messageId: 'untouched' })
  },
  meta: {
    id: 'stale-remote-branch',
    messages: { merged: 'branches on GitHub already merged into the default branch, git push origin --delete removes them: {{branches}}', untouched: 'branches on GitHub untouched for {{months}} months or more, not merged: {{branches}}' },
    severity: 'info',
  },
})

export const staleLastTag = defineProjectRule({
  appliesTo: isCheckableClone,
  check(context) {
    const { lastTag } = cloneOf(context)
    if (lastTag === undefined || lastTag.commitsSince === 0 || !isOlderThan(lastTag.at, staleTagMonths)) return
    context.report({ data: { commits: plural(lastTag.commitsSince, 'commit'), months: monthsAgo(lastTag.at), tag: lastTag.name }, messageId: 'old' })
  },
  meta: { id: 'stale-last-tag', messages: { old: 'the last tag {{tag}} is {{months}} months old and {{commits}} came since, time to tag a release' }, severity: 'info' },
})
