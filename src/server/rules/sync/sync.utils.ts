import type { LocalClone, Project } from '../../../shared/project.ts'

/**
 * Tell if a project has a clone the git checks can trust: a git repo with an origin
 * @param project the project
 * @returns true when the clone is usable
 */
export function hasUsableClone(project: Readonly<Project>) {
  return project.local !== undefined && project.local.problem === undefined
}

/**
 * Tell if a project is an archived repo that is not a fork, an archived fork only gets the pristine-fork rule
 * @param project the project
 * @returns true when the archive rules apply
 */
export function isArchivedRepo(project: Readonly<Project>) {
  return project.github?.isArchived === true && !project.github.isFork
}

/**
 * List the work of a clone that exists nowhere else, as short counts
 * @param local the clone
 * @returns like `['1 unpushed commit', '2 changed files']`, empty when the clone holds nothing unsaved
 * @example unsavedWork(clone) // ['1 unpushed commit', '3 stashes', '1 local-only branch']
 */
export function unsavedWork(local: Readonly<LocalClone>) {
  const commits = local.unpushed.flatMap(branch => branch.subjects).length
  const counts = [
    [commits, 'unpushed commit', 'unpushed commits'],
    [local.changedFiles.length, 'changed file', 'changed files'],
    [local.stashes.length, 'stash', 'stashes'],
    [local.localOnlyBranches.length, 'local-only branch', 'local-only branches'],
  ] as const
  return counts.filter(([amount]) => amount > 0).map(([amount, singular, plural]) => `${amount} ${amount === 1 ? singular : plural}`)
}
