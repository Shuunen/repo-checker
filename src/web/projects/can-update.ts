import type { Project } from '../../shared/project.ts'

/**
 * Tell if a project can be updated with Claude: it has a usable clone of the owner, where Claude works
 * @param project the project
 * @param project.isOtherOwner true when the clone belongs to someone else
 * @param project.local the clone
 * @returns true when the Update project action is offered
 * @example canUpdate(project) // true
 */
export function canUpdate({ isOtherOwner, local }: Readonly<Project>) {
  return local !== undefined && local.problem === undefined && !isOtherOwner
}
