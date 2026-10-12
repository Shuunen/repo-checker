import { styleText } from 'node:util'
import type { Severity } from './engine/define-rule.ts'
import type { ProjectResult } from './scan.ts'

/** The severities, most important first, with their title and color */
const groups = [
  { color: 'red', icon: '🔴', severity: 'error', title: 'errors' },
  { color: 'yellow', icon: '🟡', severity: 'warning', title: 'warnings' },
  { color: 'blue', icon: '🔵', severity: 'info', title: 'info' },
] as const satisfies readonly { color: string; icon: string; severity: Severity; title: string }[]

/** The number of milliseconds in one second */
const msPerSecond = 1000

/** What the report shows besides the findings */
interface ReportOptions {
  /** Color the output, for a terminal */
  hasColors: boolean
  /** How long the scan took, in milliseconds */
  durationMs: number
  /** The owner compared with */
  owner: string
  /** The scanned folder */
  target: string
}

/**
 * Color a text, or leave it plain
 * @param color the color
 * @param text the text
 * @param hasColors false to leave it plain
 * @returns the text
 */
function paint(color: (typeof groups)[number]['color'] | 'bold' | 'dim' | 'green', text: string, hasColors: boolean) {
  return hasColors ? styleText(color, text, { validateStream: false }) : text
}

/**
 * Format the lines of one severity group, aligned in columns: project, check id, message
 * @param results the project results
 * @param group the severity group
 * @param hasColors color the output
 * @returns the lines, empty when the group has no finding
 */
function groupLines(results: readonly ProjectResult[], group: (typeof groups)[number], hasColors: boolean) {
  const rows = results.flatMap(({ findings, project }) => findings.filter(finding => finding.severity === group.severity).map(finding => ({ finding, name: project.name })))
  if (rows.length === 0) return []
  const nameWidth = Math.max(...rows.map(row => row.name.length))
  const idWidth = Math.max(...rows.map(row => row.finding.ruleId.length))
  const lines = rows.map(({ finding, name }) => `  ${name.padEnd(nameWidth)}  ${paint('dim', finding.ruleId.padEnd(idWidth), hasColors)}  ${finding.message}`)
  return ['', paint(group.color, `${group.icon} ${group.title} (${rows.length})`, hasColors), ...lines]
}

/**
 * Format the scan report: a header, then the findings grouped by severity, or one line when all is well
 * @param results the project results
 * @param options what to show besides the findings
 * @returns the report text and whether a finding is an error, so the CLI can exit with an error code
 * @example const { hasErrors, text } = formatReport(projects, { durationMs: 1200, hasColors: false, owner: 'Shuunen', target: '/projects' })
 */
export function formatReport(results: readonly ProjectResult[], options: Readonly<ReportOptions>) {
  const { durationMs, hasColors, owner, target } = options
  const header = paint('bold', `repo-check · ${target} · ${owner} · ${results.length} project${results.length === 1 ? '' : 's'} in ${(durationMs / msPerSecond).toFixed(1)}s`, hasColors)
  const lines = groups.flatMap(group => groupLines(results, group, hasColors))
  const hasErrors = results.some(result => result.findings.some(finding => finding.severity === 'error'))
  const footer = lines.length === 0 ? [paint('green', '✔ all good', hasColors)] : ['', 'Run repo-check ui to fix them.']
  return { hasErrors, text: [header, ...lines, ...footer].join('\n') }
}
