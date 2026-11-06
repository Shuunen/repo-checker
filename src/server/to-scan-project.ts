import type { ScanProject } from '../shared/scan-event.ts'
import type { ProjectResult } from './check-projects.ts'

/**
 * Turn a project result into its JSON-safe shape: the edits of a fix are functions, only their files are kept
 * @param result the project result
 * @param result.findings the findings, with their edits
 * @param result.outcomes one outcome per rule
 * @param result.project the project
 * @returns the result as the page receives it
 */
export function toScanProject({ findings, outcomes, project }: Readonly<ProjectResult>): ScanProject {
  return { findings: findings.map(({ edits, ...finding }) => ({ ...finding, fixFiles: [...new Set(edits.map(edit => edit.file))] })), outcomes, project }
}
