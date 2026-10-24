import type { ActionKind } from '../../shared/action.ts'
import type { ForkStatus, LocalClone, Project } from '../../shared/project.ts'
import type { ScanFinding, Severity } from '../../shared/scan-event.ts'
import { readableTimeAgo } from 'shuutils'
import { plural } from '../../shared/text.ts'
import { type PillColor, severityColor, severityRank } from './rows.ts'

/** A small label under the project name */
interface Badge {
  /** The chip color */
  color: PillColor
  /** The text */
  label: string
}

/** One line of a facts card: a label and its value */
interface Fact {
  /** What it is */
  label: string
  /** Its value, `none` when empty */
  value: string
}

/** A titled card of facts */
interface FactGroup {
  /** The facts */
  facts: Fact[]
  /** The card title */
  title: string
}

/** How many findings of one severity a project has */
interface FindingCount {
  /** The chip color of the severity */
  color: PillColor
  /** Like `4 errors`, `1 warning` or `2 info` */
  label: string
  /** The severity, for tests */
  severity: Severity
}

/** The findings of one origin, worst first */
interface FindingGroup {
  /** The findings */
  findings: ScanFinding[]
  /** The title: where the findings come from */
  title: string
}

/** Why a folder cannot be compared with GitHub */
const problemTexts: Readonly<Record<NonNullable<LocalClone['problem']>, string>> = { 'no-git': 'not a git repository', 'no-origin': 'no origin remote' }

/**
 * The link to the repo on GitHub
 * @param project the project
 * @param project.github the GitHub repo
 * @returns the url, undefined when the project has no GitHub repo
 * @example githubUrl(project) // 'https://github.com/Shuunen/repo-checker'
 */
export function githubUrl({ github }: Readonly<Project>) {
  return github && `https://github.com/${github.owner}/${github.name}`
}

/**
 * Tell if a project can be archived: it is on GitHub and not archived yet
 * @param project the project
 * @param project.github the GitHub repo
 * @returns true when the Archive action is offered
 * @example canArchive(project) // true
 */
export function canArchive({ github }: Readonly<Project>) {
  return github !== undefined && !github.isArchived
}

/**
 * Tell if a project can be unarchived: it is on GitHub and archived
 * @param project the project
 * @param project.github the GitHub repo
 * @returns true when the Unarchive action is offered
 * @example canUnarchive(project) // false
 */
export function canUnarchive({ github }: Readonly<Project>) {
  return github?.isArchived === true
}

/**
 * The `owner/name` of the project's GitHub repo, the project name when it has none
 * @param project the project
 * @param project.github the GitHub repo
 * @param project.name the project name
 * @returns like `Shuunen/repo-checker`
 */
export function slugOf({ github, name }: Readonly<Project>) {
  return github ? `${github.owner}/${github.name}` : name
}

/**
 * The badges of a project: archived, fork, private, other owner
 * @param project the project
 * @param project.github the GitHub repo
 * @param project.isOtherOwner true when the clone belongs to another owner
 * @returns the badges, empty for a plain repo
 */
export function identityBadges({ github, isOtherOwner }: Readonly<Project>) {
  const badges: (Badge | undefined)[] = [
    github?.isArchived === true ? { color: 'warning', label: 'archived' } : undefined,
    github?.isFork === true ? { color: 'accent', label: 'fork' } : undefined,
    github?.isPrivate === true ? { color: 'default', label: 'private' } : undefined,
    isOtherOwner ? { color: 'default', label: 'other owner' } : undefined,
  ]
  return badges.filter(badge => badge !== undefined)
}

/**
 * List items in a sentence, `none` when there are none
 * @param items the items
 * @param separator what goes between them
 * @returns the text
 */
function listOrNone(items: readonly string[], separator = ', ') {
  return items.length === 0 ? 'none' : items.join(separator)
}

/**
 * How the checked out branch compares with its upstream
 * @param local the clone
 * @param local.branches the local branches
 * @param local.currentBranch the checked out branch
 * @returns like `2 ahead, 0 behind origin/master`, `none` when it is in sync
 */
function upstreamText({ branches, currentBranch }: Readonly<LocalClone>) {
  const branch = branches.find(item => item.name === currentBranch)
  if (branch === undefined) return '—'
  if (branch.upstream === undefined) return 'no upstream'
  if (branch.ahead === 0 && branch.behind === 0 && !branch.isGone) return 'none'
  return `${branch.ahead} ahead, ${branch.behind} behind ${branch.upstream}${branch.isGone ? ' (deleted on GitHub)' : ''}`
}

/**
 * What a clone holds that a safe delete depends on
 * @param local the clone
 * @returns the facts
 */
function cloneFacts(local: Readonly<LocalClone>): Fact[] {
  const commits = local.unpushed.flatMap(branch => branch.subjects.map(subject => `${branch.branch}: ${subject}`))
  return [
    { label: 'Branch', value: local.currentBranch === '' ? 'detached HEAD' : local.currentBranch },
    { label: 'Compared with its upstream', value: upstreamText(local) },
    { label: 'Unpushed commits', value: listOrNone(commits, ' · ') },
    { label: 'Uncommitted files', value: listOrNone(local.changedFiles) },
    { label: 'Stashes', value: listOrNone(local.stashes, ' · ') },
    { label: 'Local-only branches', value: listOrNone(local.localOnlyBranches) },
  ]
}

/**
 * The facts of a local folder: its path, then either why it cannot be compared with GitHub, or its git state
 * @param local the clone
 * @returns the facts
 * @example localFacts(clone)[0] // { label: 'Path', value: '/home/me/projects/app' }
 */
export function localFacts(local: Readonly<LocalClone>): Fact[] {
  const path = { label: 'Path', value: local.path }
  if (local.problem !== undefined) return [path, { label: 'Problem', value: problemTexts[local.problem] }]
  const stale = local.fetchFailed ? [{ label: 'git fetch', value: 'failed, so what is known about the remote may be stale' }] : []
  return [path, ...stale, ...cloneFacts(local)]
}

/**
 * The facts of a fork: what it was compared with, and anything that keeps it from being verified
 * @param status the fork status
 * @returns the facts
 */
export function forkFacts(status: Readonly<ForkStatus>): Fact[] {
  const ahead = status.branches.filter(branch => branch.aheadBy > 0).map(branch => `${branch.name} (${branch.aheadBy} ahead)`)
  const failures = status.failures.length > 0 ? [{ label: 'Could not verify', value: status.failures.join('; ') }] : []
  return [{ label: 'Parent', value: status.parent === '' ? 'unknown' : status.parent }, { label: 'Branches ahead of the parent', value: listOrNone(ahead) }, { label: 'Open pull requests', value: String(status.openPullRequests) }, ...failures]
}

/**
 * The fact cards of a project: its local folder, then its fork comparison, only those it has
 * @param project the project
 * @param project.github the GitHub repo
 * @param project.local the local clone
 * @returns the cards
 */
export function factGroups({ github, local }: Readonly<Project>): FactGroup[] {
  const groups: (FactGroup | undefined)[] = [local && { facts: localFacts(local), title: 'On disk' }, github?.forkStatus && { facts: forkFacts(github.forkStatus), title: 'Fork' }]
  return groups.filter(group => group !== undefined)
}

/**
 * Group the findings by where they come from, the worst first, without the empty groups
 * @param findings the findings
 * @returns the groups: Sync with GitHub, then the project files
 */
export function findingGroups(findings: readonly ScanFinding[]): FindingGroup[] {
  const sorted = findings.toSorted((first, second) => severityRank[first.severity] - severityRank[second.severity])
  const groups = [
    { findings: sorted.filter(finding => finding.scope === 'project'), title: 'Sync with GitHub' },
    { findings: sorted.filter(finding => finding.scope === 'file'), title: 'Project files' },
  ]
  return groups.filter(group => group.findings.length > 0)
}

/**
 * The distinct actions the findings offer
 * @param findings the findings
 * @returns the actions, in the order the findings offer them
 */
export function offeredActions(findings: readonly ScanFinding[]): ActionKind[] {
  return [...new Set(findings.flatMap(finding => finding.actions))]
}

/** The rules whose findings the git fixes settle: branches without upstream, forgotten stashes and a clone behind its remote */
const gitFixRules = new Set(['behind-remote', 'branch-without-upstream', 'forgotten-stash'])

/** The message of `stale-local-branch` the git fixes settle: the merged branches are deleted, the untouched ones that are not merged are left to you */
const mergedBranchesMessage = 'merged'

/**
 * Tell if a finding is one the git fixes can settle
 * @param finding the finding
 * @param finding.messageId the message id the rule reported
 * @param finding.ruleId the id of the rule that reported it
 * @returns true for a git issue
 */
export function isGitIssue({ messageId, ruleId }: Readonly<ScanFinding>) {
  return gitFixRules.has(ruleId) || (ruleId === 'stale-local-branch' && messageId === mergedBranchesMessage)
}

/**
 * Say what the fixes can do
 * @param fixable the findings that have a file fix
 * @param gitIssues the git issues
 * @returns the sentence
 */
export function summaryOf(fixable: readonly ScanFinding[], gitIssues: readonly ScanFinding[]) {
  const files = fixable.length > 0 && `${plural(fixable.length, 'finding')} can be fixed by rewriting ${plural(new Set(fixable.flatMap(finding => finding.fixFiles)).size, 'file')}.`
  const git = gitIssues.length > 0 && `${plural(gitIssues.length, 'git issue')} can be fixed in the clone.`
  return [files, git].filter(Boolean).join(' ')
}

/**
 * Describe what a finding would change when it has a fix
 * @param finding the finding
 * @param finding.fixFiles the files the fix would change
 * @returns like `fix available: package.json, README.md`, undefined without a fix
 */
export function fixText({ fixFiles }: Readonly<ScanFinding>) {
  return fixFiles.length === 0 ? undefined : `fix available in ${plural(fixFiles.length, 'file')}: ${fixFiles.join(', ')}`
}

/**
 * Say why unarchive and push cannot run: it only pushes and never creates a commit, so it needs a clone without uncommitted files and without a stash
 * @param local the clone
 * @returns the reason, undefined when the clone holds only commits and branches
 */
export function unarchiveBlocker(local: Readonly<LocalClone>) {
  if (local.changedFiles.length > 0) return `The clone has ${plural(local.changedFiles.length, 'uncommitted file')}. This action only pushes and never creates a commit: commit or discard them by hand first.`
  if (local.stashes.length > 0) return `The clone has ${plural(local.stashes.length, 'stash')}. This action only pushes: apply or drop them by hand first.`
  return undefined
}

/**
 * Count the findings by severity, the worst first, without the severities that have none
 * @param findings the findings
 * @returns one count per severity present
 * @example findingCounts(findings)[0] // { color: 'danger', label: '4 errors', severity: 'error' }
 */
export function findingCounts(findings: readonly ScanFinding[]): FindingCount[] {
  const severities: Severity[] = ['error', 'warning', 'info']
  const counts = severities.map(severity => ({ count: findings.filter(finding => finding.severity === severity).length, severity }))
  return counts.filter(item => item.count > 0).map(({ count, severity }) => ({ color: severityColor[severity], label: severity === 'info' ? `${count} info` : plural(count, severity), severity }))
}

/**
 * Keep the facts that say something: the empty ones (`none`) are left out, there is nothing to warn about
 * @param facts the facts
 * @returns the facts that are not empty
 * @example dropQuietFacts([{ label: 'Stashes', value: 'none' }]) // []
 */
export function dropQuietFacts(facts: readonly Fact[]) {
  return facts.filter(fact => fact.value !== 'none')
}

/**
 * Say when a project was last pushed, as an age and the date
 * @param pushedAt the ISO date of the last push
 * @param now the date to count from
 * @returns like `last push 4 weeks ago (2026-09-14)`
 */
export function describePush(pushedAt: string, now = new Date()) {
  return `last push ${readableTimeAgo(now.getTime() - new Date(pushedAt).getTime())} (${pushedAt.slice(0, 'yyyy-mm-dd'.length)})`
}
