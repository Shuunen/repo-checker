import { invariant } from 'es-toolkit'
import type { LocalClone } from '../../../shared/project.ts'
import type { ProjectContext } from '../../engine/define-project-rule.ts'
import { hasUsableClone, isArchivedRepo } from '../sync/sync.utils.ts'

/**
 * Tell if the git state of the clone is worth checking: a usable clone that is not another owner's, and not of an archived repo, which has its own checks
 * @param context the project context
 * @param context.project the project
 * @returns true when the clone checks apply
 */
export function isCheckableClone({ project }: Readonly<ProjectContext>) {
  return hasUsableClone(project) && !project.isOtherOwner && !isArchivedRepo(project)
}

/**
 * Tell if what the clone says about its remote can be trusted: the clone has a GitHub repo and its last fetch worked
 * @param context the project context
 * @param context.project the project
 * @returns true when the remote refs are fresh
 */
export function hasFreshRemote(context: Readonly<ProjectContext>) {
  const { local } = context.project
  return isCheckableClone(context) && context.project.github !== undefined && local?.fetchFailed === false
}

/**
 * Read the clone in a rule whose appliesTo guarantees it exists
 * @param context the project context
 * @param context.project the project
 * @returns the clone
 */
export function cloneOf({ project }: Readonly<ProjectContext>): LocalClone {
  invariant(project.local !== undefined, 'appliesTo guarantees a usable clone')
  return project.local
}
