import type { Project } from '../../shared/project.ts'
import { errorMessage } from '../../shared/text.ts'
import { buildContext } from '../engine/context.ts'
import type { ProjectRule } from '../engine/define-project-rule.ts'
import type { Rule } from '../engine/define-rule.ts'
import { diskIo } from '../engine/io.ts'
import { type CheckResult, checkProject, checkProjectRules } from '../engine/runner.ts'
import type { ProjectResult } from './check-projects.ts'
import { externalFlags } from './facts.ts'

/** The rules split by flavor */
export interface SplitRules {
  /** Run on usable clones of the owner */
  fileRules: readonly Rule[]
  /** Run on every project */
  projectRules: readonly ProjectRule[]
}

/**
 * Check one project: project rules always, file rules only on a usable clone of the owner
 * @param project the project
 * @param rules the rules split by flavor
 * @param rules.fileRules run on usable clones of the owner
 * @param rules.projectRules run on every project
 * @param siblings every project of the scan, for the rules that compare projects, none when the project is checked alone
 * @returns the findings and the rule outcomes, project rules first. File rules that cannot run are not listed
 */
export async function checkOne(project: Readonly<Project>, { fileRules, projectRules }: Readonly<SplitRules>, siblings: readonly Project[] = []): Promise<CheckResult> {
  const result = await checkProjectRules(projectRules, project, siblings)
  const { isOtherOwner, local } = project
  if (local === undefined || local.problem !== undefined || isOtherOwner) return result
  const io = diskIo(local.path)
  const files = await checkProject(fileRules, await buildContext(io, await externalFlags(project.github, { files: io })))
  return { findings: [...result.findings, ...files.findings], outcomes: [...result.outcomes, ...files.outcomes] }
}

/**
 * The result of a project whose checks threw: one error finding says so, so the rest of the scan goes on and the page shows what failed
 * @param project the project
 * @param error what was thrown
 * @returns the result
 */
export function failedResult(project: Readonly<Project>, error: unknown): ProjectResult {
  const message = errorMessage(error)
  return { findings: [{ actions: [], edits: [], installs: [], message: `the checks of this project failed: ${message}`, messageId: 'failed', ruleId: 'checks-failed', scope: 'project', severity: 'error' }], outcomes: [], project }
}
