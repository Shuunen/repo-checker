import type { ActionKind } from '../../shared/action.ts'
import type { ScanFinding, ScanProject, Severity } from '../../shared/scan-event.ts'
import { plural } from '../../shared/text.ts'

/** A HeroUI chip color */
export type PillColor = 'accent' | 'danger' | 'default' | 'success' | 'warning'

/** One status pill of a row */
interface Pill {
  /** The chip color */
  color: PillColor
  /** The full message, shown on hover */
  hint: string
  /** The text */
  label: string
}

/** What one table row shows */
export interface ProjectRow {
  /** The action a click would start, undefined when there is none */
  action: string | undefined
  /** The address of the project view */
  href: string
  /** The row key, the project name */
  id: string
  /** The checked out branch, a dash when not cloned, without git or on a detached HEAD */
  branch: string
  /** The month of the last push, like `2026-10`, a dash without GitHub repo */
  lastPush: string
  /** The project name */
  name: string
  /** The status pills */
  pills: Pill[]
  /** Sort key: 0 for an error, 1 for a warning, 2 for info, 3 for nothing to report */
  rank: number
}

/** The pill color of each severity */
export const severityColor: Readonly<Record<Severity, PillColor>> = { error: 'danger', info: 'accent', warning: 'warning' }

/** The rank of each severity, the worst first */
export const severityRank: Readonly<Record<Severity, number>> = { error: 0, info: 2, warning: 1 }

/** The button label of each action */
const actionLabels: Readonly<Record<ActionKind, string>> = { clone: 'Clone', 'delete-clone': 'Delete clone', 'delete-fork': 'Delete fork', discard: 'Discard', 'unarchive-push-rearchive': 'Unarchive & push' }

/** The short label of each Sync finding, by `ruleId.messageId`, a finding missing here shows its rule id */
const syncLabels: Readonly<Record<string, string>> = {
  'archived-clone.cannotVerify': 'archived · cannot verify',
  'archived-clone.safe': 'archived · safe to delete',
  'archived-with-unsaved-work.unsaved': 'archived · unsaved work',
  'archived-with-unsaved-work.unsavedNoFetch': 'archived · unsaved work',
  'broken-clone.noGit': 'no git',
  'broken-clone.noOrigin': 'no origin',
  'broken-clone.originNotFound': 'origin not found',
  'checks-failed.failed': 'checks failed',
  'not-cloned.missing': 'not cloned',
  'pristine-fork.cannotVerify': 'fork · cannot verify',
  'pristine-fork.kept': 'fork with work',
  'pristine-fork.notChecked': 'fork · not compared',
  'pristine-fork.pristine': 'pristine fork',
  'pristine-fork.pristineWithClone': 'pristine fork',
}

/**
 * The pill of a Sync finding
 * @param finding the finding
 * @returns the pill
 */
function syncPill(finding: Readonly<ScanFinding>): Pill {
  return { color: severityColor[finding.severity], hint: finding.message, label: syncLabels[`${finding.ruleId}.${finding.messageId}`] ?? finding.ruleId.replaceAll('-', ' ') }
}

/** The rank of a project with nothing to report */
const quietRank = 3

/**
 * The status pills of a project: one per Sync finding, then the counts of file errors and warnings, or "all good"
 * @param result the project result
 * @param result.findings the findings
 * @param result.project the project
 * @returns the pills
 */
function toPills({ findings, project }: Readonly<ScanProject>): Pill[] {
  if (project.isOtherOwner) return [{ color: 'default', hint: 'the origin belongs to another owner, the Sync checks leave it out', label: 'other owner' }]
  const sync = findings.filter(finding => finding.scope === 'project').map(finding => syncPill(finding))
  const counts = (['error', 'warning'] as const).map(severity => ({ count: findings.filter(finding => finding.scope === 'file' && finding.severity === severity).length, severity }))
  const files = counts.filter(({ count }) => count > 0).map(({ count, severity }) => ({ color: severityColor[severity], hint: `${plural(count, severity)} in the project files`, label: plural(count, severity) }))
  const pills = [...sync, ...files]
  return pills.length > 0 ? pills : [{ color: 'success', hint: 'no error and no warning', label: 'all good' }]
}

/**
 * The address of the project view
 * @param name the project name
 * @returns the path, like `/project/jozzo`
 * @example projectHref('jozzo') // '/project/jozzo'
 */
export function projectHref(name: string) {
  return `/project/${encodeURIComponent(name)}`
}

/**
 * Turn a project result into a table row
 * @param result the project result
 * @returns the row
 */
function toRow(result: Readonly<ScanProject>): ProjectRow {
  const { findings, project } = result
  const action = findings.find(finding => finding.actions.length > 0)?.actions[0]
  const rank = Math.min(quietRank, ...findings.map(finding => severityRank[finding.severity]))
  const branch = project.local?.currentBranch ?? ''
  return { action: action && actionLabels[action], branch: branch === '' ? '—' : branch, href: projectHref(project.name), id: project.name, lastPush: project.github?.pushedAt.slice(0, 'yyyy-mm'.length) ?? '—', name: project.name, pills: toPills(result), rank }
}

/**
 * Turn project results into rows, the worst first, then by name
 * @param results the project results
 * @returns the sorted rows
 * @example const rows = toRows(state.projects)
 */
export function toRows(results: readonly ScanProject[]) {
  return results.map(result => toRow(result)).toSorted((first, second) => first.rank - second.rank || first.name.localeCompare(second.name))
}
