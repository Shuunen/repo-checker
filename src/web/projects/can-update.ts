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

/**
 * Tell if a project has local branches to delete: a usable clone of the owner with a branch that is neither the default branch of GitHub nor the checked out one, git cannot delete that one
 * @param project the project
 * @param project.github the GitHub repo
 * @param project.isOtherOwner true when the clone belongs to someone else
 * @param project.local the clone
 * @returns true when the Delete local branches action is offered
 * @example canDeleteBranches(project) // true
 */
export function canDeleteBranches({ github, isOtherOwner, local }: Readonly<Project>) {
  if (github === undefined || local === undefined || local.problem !== undefined || isOtherOwner) return false
  return local.branches.some(branch => branch.name !== github.defaultBranch && branch.name !== local.currentBranch)
}
