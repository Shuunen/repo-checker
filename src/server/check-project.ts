import type { Project } from '../shared/project.ts'
import { buildContext } from './engine/context.ts'
import type { ProjectRule } from './engine/define-project-rule.ts'
import type { Rule } from './engine/define-rule.ts'
import { diskIo } from './engine/io.ts'
import { type CheckResult, checkProject, checkProjectRules } from './engine/runner.ts'

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
 * @returns the findings and the rule outcomes, project rules first. File rules that cannot run are not listed
 */
export async function checkOne(project: Readonly<Project>, { fileRules, projectRules }: Readonly<SplitRules>): Promise<CheckResult> {
  const result = await checkProjectRules(projectRules, project)
  const { isOtherOwner, local } = project
  if (local === undefined || local.problem !== undefined || isOtherOwner) return result
  const files = await checkProject(fileRules, await buildContext(diskIo(local.path), { isPrivate: project.github?.isPrivate === true }))
  return { findings: [...result.findings, ...files.findings], outcomes: [...result.outcomes, ...files.outcomes] }
}
