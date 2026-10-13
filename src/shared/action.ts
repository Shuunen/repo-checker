/**
 * The actions a Sync finding can offer. They are only names here: the server runs them, each behind a confirmation and a fresh safety re-check.
 * @module
 */
import type { UnsavedGroup } from './unsaved.ts'

/** An action that changes something outside the project files, on disk or on GitHub */
export type ActionKind =
  /** Clone a repo that has no local clone */
  | 'clone'
  /** Delete a local clone, only offered when it is provably clean */
  | 'delete-clone'
  /** Delete a pristine fork on GitHub, and its clean local clone if any */
  | 'delete-fork'
  /** Reset an archived repo's clone to the remote state, dropping every unsaved item */
  | 'discard'
  /** Unarchive the repo, push the unsaved commits and branches, archive it again */
  | 'unarchive-push-rearchive'

/** What running an action gives: it worked, or it was refused or failed with the reason to show */
export type ActionResult = { message: string; ok: true } | { ok: false; reason: string }

/** What a delete of a local clone would remove, shown before it is confirmed: the files git ignores are lost for good, everything else is on GitHub */
export type DeletePreview = { ignoredFiles: string[]; ok: true; path: string } | { ok: false; reason: string }

/** What a discard would throw away, read fresh from the clone when the dialog opens: the fingerprint of that exact list is sent back with the confirmation, and the discard is refused when the work is not the same any more */
export type DiscardPreview = { fingerprint: string; groups: UnsavedGroup[]; ok: true; path: string } | { ok: false; reason: string }

/** What deleting a fork would remove, shown before it is confirmed: the fork on GitHub, and its clean local clone with the files git ignores in it */
export type ForkDeletePreview = { branches: number; clone: { ignoredFiles: string[]; path: string } | undefined; ok: true; parent: string } | { ok: false; reason: string }

/** The planned change of one file, what the confirmation shows as a diff: `before` is empty when the file does not exist yet */
export interface FixPlan {
  /** The text once the fixes are applied */
  after: string
  /** The current text */
  before: string
  /** The file path, relative to the project folder */
  file: string
}

/** What applying the file fixes of a project would change, read fresh when the dialog opens: the fingerprint of that plan is sent back with the confirmation, and the fix is refused when the plan is not the same any more. A file with uncommitted changes is never rewritten, it is listed in `blocked` */
export type FixPreview = { blocked: { file: string; reason: string }[]; fingerprint: string; ok: true; path: string; plans: FixPlan[] } | { ok: false; reason: string }
