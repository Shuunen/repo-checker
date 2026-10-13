import { invariant } from 'es-toolkit'
import type { LocalClone } from '../../../shared/project.ts'
import { plural } from '../../../shared/text.ts'
import { defineProjectRule, type ProjectContext } from '../../engine/define-project-rule.ts'
import { hasUsableClone, isArchivedRepo } from '../sync/sync.utils.ts'

/**
 * Tell if the git state of the clone is worth checking: a usable clone that is not another owner's, and not of an archived repo, which has its own checks
 * @param context the project context
 * @param context.project the project
 * @returns true when the clone checks apply
 */
function isCheckableClone({ project }: Readonly<ProjectContext>) {
  return hasUsableClone(project) && !project.isOtherOwner && !isArchivedRepo(project)
}

/**
 * Tell if what the clone says about its remote can be trusted: the clone has a GitHub repo and its last fetch worked
 * @param context the project context
 * @param context.project the project
 * @returns true when the remote refs are fresh
 */
function hasFreshRemote(context: Readonly<ProjectContext>) {
  const { local } = context.project
  return isCheckableClone(context) && context.project.github !== undefined && local?.fetchFailed === false
}

/**
 * Read the clone in a rule whose appliesTo guarantees it exists
 * @param context the project context
 * @param context.project the project
 * @returns the clone
 */
function cloneOf({ project }: Readonly<ProjectContext>): LocalClone {
  invariant(project.local !== undefined, 'appliesTo guarantees a usable clone')
  return project.local
}

export const behindRemote = defineProjectRule({
  appliesTo: hasFreshRemote,
  check(context) {
    const behind = cloneOf(context).branches.filter(branch => branch.behind > 0 && !branch.isGone)
    if (behind.length > 0) context.report({ data: { branches: behind.map(branch => `${branch.name} (${branch.behind} behind)`).join(', ') }, messageId: 'behind' })
  },
  meta: { id: 'behind-remote', messages: { behind: 'behind its remote, it needs a pull: {{branches}}' }, severity: 'warning' },
})

export const uncommittedFiles = defineProjectRule({
  appliesTo: isCheckableClone,
  check(context) {
    const { changedFiles } = cloneOf(context)
    if (changedFiles.length > 0) context.report({ data: { files: plural(changedFiles.length, 'uncommitted or untracked file') }, messageId: 'found' })
  },
  meta: { id: 'uncommitted-files', messages: { found: '{{files}}' }, severity: 'warning' },
})

export const unpushedCommits = defineProjectRule({
  appliesTo: hasFreshRemote,
  check(context) {
    const { unpushed } = cloneOf(context)
    if (unpushed.length > 0) context.report({ data: { branches: unpushed.map(item => `${item.branch} (${plural(item.subjects.length, 'commit')})`).join(', ') }, messageId: 'found' })
  },
  meta: { id: 'unpushed-commits', messages: { found: 'commits that are not on the remote: {{branches}}' }, severity: 'warning' },
})

export const forgottenStash = defineProjectRule({
  appliesTo: isCheckableClone,
  check(context) {
    const { stashes } = cloneOf(context)
    if (stashes.length > 0) context.report({ data: { stashes: plural(stashes.length, 'stash') }, messageId: 'found' })
  },
  meta: { id: 'forgotten-stash', messages: { found: '{{stashes}} never reapplied or dropped' }, severity: 'info' },
})

export const branchWithoutUpstream = defineProjectRule({
  appliesTo: isCheckableClone,
  check(context) {
    const { localOnlyBranches } = cloneOf(context)
    if (localOnlyBranches.length > 0) context.report({ data: { branches: localOnlyBranches.join(', ') }, messageId: 'found' })
  },
  meta: { id: 'branch-without-upstream', messages: { found: 'local branches with no upstream, or whose upstream was deleted: {{branches}}' }, severity: 'info' },
})

export const notOnDefaultBranch = defineProjectRule({
  appliesTo: ({ project }) => hasUsableClone(project) && !project.isOtherOwner && !isArchivedRepo(project) && project.github !== undefined,
  check({ project, report }) {
    invariant(project.local !== undefined && project.github !== undefined, 'appliesTo guarantees a clone and its repo')
    const { currentBranch } = project.local
    if (currentBranch !== project.github.defaultBranch) report({ data: { branch: currentBranch === '' ? 'a detached HEAD' : currentBranch, defaultBranch: project.github.defaultBranch }, messageId: 'found' })
  },
  meta: { id: 'not-on-default-branch', messages: { found: 'checked out on {{branch}}, the default branch is {{defaultBranch}}' }, severity: 'info' },
})
