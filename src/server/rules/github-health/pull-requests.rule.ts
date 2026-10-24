import { invariant } from 'es-toolkit'
import type { GithubRepo, PullRequestCounts } from '../../../shared/project.ts'
import { plural } from '../../../shared/text.ts'
import { defineProjectRule, type ProjectContext } from '../../engine/define-project-rule.ts'

/**
 * Tell if the open pull requests and issues of the repo are worth checking: an own repo that is alive and whose pull requests were read. Without them an issue count would include pull requests
 * @param context the project context
 * @param context.project the project
 * @returns true when the checks apply
 */
function hasReadPullRequests({ project }: Readonly<ProjectContext>) {
  return project.github?.pullRequests !== undefined && !project.github.isArchived && !project.github.isFork && !project.isOtherOwner
}

/**
 * Read the repo and its pull request counts in a rule whose appliesTo guarantees them
 * @param context the project context
 * @param context.project the project
 * @returns the repo and its counts
 */
function repoOf({ project }: Readonly<ProjectContext>): { counts: PullRequestCounts; repo: GithubRepo } {
  invariant(project.github?.pullRequests !== undefined, 'appliesTo guarantees a repo with its pull requests')
  return { counts: project.github.pullRequests, repo: project.github }
}

export const openPullRequests = defineProjectRule({
  appliesTo: hasReadPullRequests,
  check(context) {
    const { other } = repoOf(context).counts
    if (other > 0) context.report({ data: { count: plural(other, 'pull request') }, messageId: 'open' })
  },
  meta: { id: 'open-pull-requests', messages: { open: '{{count}} waiting for review' }, severity: 'info' },
})

export const openRenovatePullRequests = defineProjectRule({
  appliesTo: hasReadPullRequests,
  check(context) {
    const { renovate } = repoOf(context).counts
    if (renovate > 0) context.report({ data: { count: plural(renovate, 'Renovate pull request') }, messageId: 'open' })
  },
  meta: { id: 'open-renovate-pr', messages: { open: '{{count}} waiting to be merged' }, severity: 'warning' },
})

export const openIssues = defineProjectRule({
  appliesTo: hasReadPullRequests,
  check(context) {
    const { counts, repo } = repoOf(context)
    const issues = repo.openItems - counts.other - counts.renovate
    if (issues > 0) context.report({ data: { count: plural(issues, 'open issue') }, messageId: 'open' })
  },
  meta: { id: 'open-issues', messages: { open: '{{count}}' }, severity: 'info' },
})
