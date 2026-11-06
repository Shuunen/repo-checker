/**
 * What a local clone holds that exists nowhere else, item by item: the one list the page shows in its dialogs and the server proves again before it discards anything.
 * @module
 */
import type { LocalClone } from './project.ts'

/** The unsaved items of one kind */
export interface UnsavedGroup {
  /** The items: commit messages, file names, stash entries, branch names */
  items: string[]
  /** What they are */
  title: string
}

/**
 * List what a clone holds that exists nowhere else, item by item: the commit messages, the changed file names, the stash entries and the local-only branch names
 * @param local the clone
 * @returns the groups that have an item, in that order
 * @example unsavedGroups(clone) // [{ title: 'Unpushed commits', items: ['master: fix a'] }]
 */
export function unsavedGroups(local: Readonly<LocalClone>): UnsavedGroup[] {
  const groups = [
    { items: local.unpushed.flatMap(branch => branch.subjects.map(subject => `${branch.branch}: ${subject}`)), title: 'Unpushed commits' },
    { items: local.localOnlyBranches, title: 'Local-only branches' },
    { items: local.changedFiles, title: 'Uncommitted files' },
    { items: local.stashes, title: 'Stashes' },
  ]
  return groups.filter(group => group.items.length > 0)
}
