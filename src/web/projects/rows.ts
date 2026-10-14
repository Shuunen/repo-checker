import type { ActionKind } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import type { ScanFinding, ScanProject, Severity } from '../../shared/scan-event.ts'
import { plural } from '../../shared/text.ts'

/** A HeroUI chip color */
export type PillColor = 'accent' | 'danger' | 'default' | 'success' | 'warning'

/** One status pill of a row */
export interface Pill {
  /** The chip color */
  color: PillColor
  /** The full message, shown on hover */
  hint: string
  /** The icon drawn before the text, none when absent */
  icon?: 'archive' | 'lock'
  /** True for the usual value (public, active), the list leaves it blank to show only the exceptions */
  isUsual?: true
  /** The text */
  label: string
}

/** What one table row shows */
export interface ProjectRow {
  /** Every action the project offers, the Actions menu of the row lists them, empty when there is none */
  actions: ActionKind[]
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
  /** Private or public, undefined without GitHub repo */
  visibility: Pill | undefined
  /** Active or archived, undefined without GitHub repo */
  state: Pill | undefined
  /** The project, for its action button */
  project: Project
  /** The health pill */
  health: Pill
  /** Sort key: 0 for an error, 1 for a warning, 2 for info, 3 for nothing to report */
  rank: number
}

/** The pill color of each severity */
export const severityColor: Readonly<Record<Severity, PillColor>> = { error: 'danger', info: 'accent', warning: 'warning' }

/** The rank of each severity, the worst first */
export const severityRank: Readonly<Record<Severity, number>> = { error: 0, info: 2, warning: 1 }

/** The rank of a project with nothing to report */
const quietRank = 3

/**
 * The visibility pill of a project, undefined without GitHub repo
 * @param project the project
 * @returns the pill
 */
function visibilityPill(project: Readonly<Project>): Pill | undefined {
  if (project.github === undefined) return undefined
  return project.github.isPrivate ? { color: 'default', hint: 'the GitHub repo is private', icon: 'lock', label: 'private' } : { color: 'default', hint: 'the GitHub repo is public', isUsual: true, label: 'public' }
}

/**
 * The state pill of a project, undefined without GitHub repo
 * @param project the project
 * @returns the pill
 */
function statePill(project: Readonly<Project>): Pill | undefined {
  if (project.github === undefined) return undefined
  return project.github.isArchived ? { color: 'default', hint: 'the GitHub repo is archived, read-only', icon: 'archive', label: 'archived' } : { color: 'default', hint: 'the GitHub repo is active', isUsual: true, label: 'active' }
}

/**
 * The health pill of a project: the count of its worst severity, or "all good" when it has no finding
 * @param findings the findings
 * @returns the pill
 */
function healthPill(findings: readonly ScanFinding[]): Pill {
  const worst = (['error', 'warning', 'info'] as const).find(severity => findings.some(finding => finding.severity === severity))
  if (worst === undefined) return { color: 'success', hint: 'nothing to report', label: 'all good' }
  const hint = findings.map(finding => finding.message).join('\n')
  return { color: severityColor[worst], hint, label: plural(findings.filter(finding => finding.severity === worst).length, worst) }
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
  const rank = Math.min(quietRank, ...findings.map(finding => severityRank[finding.severity]))
  const branch = project.local?.currentBranch ?? ''
  return {
    actions: [...new Set(findings.flatMap(finding => finding.actions))],
    branch: branch === '' ? '—' : branch,
    health: healthPill(findings),
    href: projectHref(project.name),
    id: project.name,
    lastPush: project.github?.pushedAt.slice(0, 'yyyy-mm'.length) ?? '—',
    name: project.name,
    project,
    rank,
    state: statePill(project),
    visibility: visibilityPill(project),
  }
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
