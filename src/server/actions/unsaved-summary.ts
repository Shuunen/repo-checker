import type { LocalClone } from '../../shared/project.ts'
import { plural } from '../../shared/text.ts'
import { listIgnoredFiles } from './ignored-files.ts'

/**
 * List what the clone holds that exists nowhere else, so the confirmation can say what is lost for good
 * @param clone the clone
 * @returns one sentence per kind of unsaved work, empty for a clean clone
 */
function unsavedOf(clone: Readonly<LocalClone>) {
  const commits = clone.unpushed.reduce((total, { subjects }) => total + subjects.length, 0)
  return [
    commits > 0 ? `${plural(commits, 'unpushed commit')}` : '',
    clone.changedFiles.length > 0 ? `${plural(clone.changedFiles.length, 'uncommitted or untracked file')}` : '',
    clone.stashes.length > 0 ? `${plural(clone.stashes.length, 'stash entry')}` : '',
    clone.localOnlyBranches.length > 0 ? `${plural(clone.localOnlyBranches.length, 'local-only branch')} (${clone.localOnlyBranches.join(', ')})` : '',
  ].filter(Boolean)
}

/**
 * Say what a delete of the clone loses for good: the files git ignores and the unsaved work
 * @param clone the clone
 * @returns the path, the ignored files (none to list for a folder that is not a git repo) and the unsaved work
 */
export async function lostWith(clone: Readonly<LocalClone>) {
  return { ignoredFiles: clone.problem === undefined ? await listIgnoredFiles(clone.path) : [], path: clone.path, unsaved: unsavedOf(clone) }
}
