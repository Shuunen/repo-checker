import type { ScanProject } from '../../shared/scan-event.ts'
import type { ProjectResult } from './check-projects.ts'
import { type IgnoredRules, neverIgnored } from './ignored-rules.ts'

/**
 * Turn a project result into its JSON-safe shape: the edits of a fix are functions, only their files are kept. The rules the user ignored for now are left out, and their outcome is skipped
 * @param result the project result
 * @param result.findings the findings, with their edits
 * @param result.outcomes one outcome per rule
 * @param result.project the project
 * @param ignored the rules the user ignored, none by default
 * @returns the result as the page receives it
 */
export function toScanProject({ findings, outcomes, project }: Readonly<ProjectResult>, ignored: IgnoredRules = neverIgnored): ScanProject {
  const isShown = (ruleId: string) => !ignored.isIgnored(project.name, ruleId)
  return {
    findings: findings.filter(finding => isShown(finding.ruleId)).map(({ edits, ...finding }) => Object.assign(finding, { fixFiles: [...new Set(edits.map(edit => edit.file))] })),
    outcomes: outcomes.map(outcome => (isShown(outcome.ruleId) ? outcome : { ...outcome, status: 'skipped' as const })),
    project,
  }
}
