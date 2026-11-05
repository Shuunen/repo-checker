/**
 * The actions a Sync finding can offer. They are only names here: the server runs them, each behind a confirmation and a fresh safety re-check.
 * @module
 */
import type { UnsavedGroup } from './unsaved.ts'
import { errorMessage } from './text.ts'

/** An action that changes something outside the project files, on disk or on GitHub */
export type ActionKind =
  /** Archive the repo on GitHub, read-only, it can be unarchived */
  | 'archive'
  /** Check out the default branch of GitHub in the clone */
  | 'checkout-default'
  /** Clone a repo that has no local clone */
  | 'clone'
  /** Delete a local clone, only offered when it is provably clean */
  | 'delete-clone'
  /** Delete a pristine fork on GitHub, and its clean local clone if any */
  | 'delete-fork'
  /** Sync the description (package.json) and the homepage of the deployed website (`webUrl` of `.repo-checker.json`) with the repo on GitHub, after a review */
  | 'sync-github-metadata'
  /** Reset an archived repo's clone to the remote state, dropping every unsaved item */
  | 'discard'
  /** Unarchive the repo, push the unsaved commits and branches, archive it again */
  | 'unarchive-push'

/** An action every project can offer, whatever the findings say: it is not tied to a Sync finding */
type StandaloneAction = 'delete-branches' | 'delete-project' | 'unarchive' | 'update-project'

/** Everything the Actions menu of a project can hold */
export type ProjectAction = ActionKind | StandaloneAction

/** How the page asks the server for an action */
interface ActionRoute {
  /** What the toast says once it worked, `{name}` being the project */
  done: string
  /** True when the confirmation sends back the fingerprint of the preview, and the server refuses when what it lists changed */
  hasFingerprint?: true
  /** True when a GET says what the action would do, before it is confirmed */
  hasPreview?: true
}

/** Every action the page posts, by its route: `POST /api/projects/:name/<route>` runs it, and `GET` says what it would do when it has a preview */
export const postedActions = {
  archive: { done: 'Archived {name} on GitHub' },
  'checkout-default': { done: 'Checked out the default branch of {name}' },
  clone: { done: 'Cloned {name}' },
  'delete-branches': { done: 'Deleted the local branches of {name}', hasFingerprint: true, hasPreview: true },
  'delete-clone': { done: 'Deleted the clone of {name}', hasPreview: true },
  'delete-fork': { done: 'Deleted the fork of {name}', hasPreview: true },
  'delete-project': { done: 'Deleted {name}, its GitHub repo and its clone', hasPreview: true },
  discard: { done: 'Discarded the unsaved work of {name}', hasFingerprint: true, hasPreview: true },
  'fix-files': { done: 'Fixed the files of {name}', hasFingerprint: true, hasPreview: true },
  'fix-git': { done: 'Fixed the git issues of {name}', hasFingerprint: true, hasPreview: true },
  'sync-github-metadata': { done: 'Synced the description and homepage of {name} between the project and GitHub', hasPreview: true },
  unarchive: { done: 'Unarchived {name} on GitHub' },
  'unarchive-push': { done: 'Unarchived and pushed {name}' },
} as const satisfies Record<string, ActionRoute>

/** An action the page posts, the route of the server that runs it */
export type PostedAction = keyof typeof postedActions

/** The actions that say what they would do before they are confirmed */
export type PreviewedAction = { [Action in PostedAction]: (typeof postedActions)[Action] extends { hasPreview: true } ? Action : never }[PostedAction]

/** The actions whose confirmation sends back the fingerprint of the preview */
export type FingerprintedAction = { [Action in PostedAction]: (typeof postedActions)[Action] extends { hasFingerprint: true } ? Action : never }[PostedAction]

/** The steps of applying the file fixes the dialog can show: the files are written, the dependencies installed, the check of the project runs, the commit is prepared, then pushed */
export type FixStage = 'checking' | 'committing' | 'installing' | 'pushing' | 'writing'

/** A refusal, with the reason to show */
export interface Refused {
  /** Always false, it tells a refusal from an answer that worked */
  ok: false
  /** Why it was refused or failed */
  reason: string
}

/**
 * What worked with its data, or a refusal
 * @template Data what is given when it worked
 */
export type Refusable<Data extends object> = (Data & { ok: true }) | Refused

/**
 * Refuse with a reason
 * @param reason why it is refused
 * @returns the refusal
 * @example refused('the clone is gone') // { ok: false, reason: 'the clone is gone' }
 */
export function refused(reason: string): Refused {
  return { ok: false, reason }
}

/**
 * Run something that answers with a result, and turn anything it throws into a refusal with the message of the error
 * @template Result what it answers
 * @param run what to run
 * @returns its answer, or the refusal
 * @example return attempt(async () => ({ message: 'done', ok: true }))
 */
export function attempt<Result extends { ok: boolean }>(run: () => Promise<Result>): Promise<Refused | Result> {
  return run().catch((error: unknown) => refused(errorMessage(error)))
}

/** What running an action gives: it worked, or it was refused or failed with the reason to show. `commitBlocked` is set when the files were fixed but the automatic commit was prevented, with the output of the failing check */
export type ActionResult = Refusable<{ commitBlocked?: string; message: string }>

/** The description and the homepage of a repo on GitHub, empty text when there is none */
export interface MetadataValues {
  /** The description */
  description: string
  /** The homepage */
  homepage: string
}

/** What syncing the infos would set, read fresh when the dialog opens: what the project says (`local`: the description of its package.json and the `webUrl` of its `.repo-checker.json`) and GitHub have now, and the values `proposed`, which the user can edit before confirming. The confirmed values are written in both */
export type MetadataPreview = Refusable<{ github: MetadataValues; local: MetadataValues; proposed: MetadataValues }>

/** What a delete of a local clone would remove, shown before it is confirmed: the files git ignores are lost for good, everything else is on GitHub */
export type DeletePreview = Refusable<{ ignoredFiles: string[]; path: string }>

/** What a discard would throw away, read fresh from the clone when the dialog opens: the fingerprint of that exact list is sent back with the confirmation, and the discard is refused when the work is not the same any more */
export type DiscardPreview = Refusable<{ fingerprint: string; groups: UnsavedGroup[]; path: string }>

/** What deleting a fork would remove, shown before it is confirmed: the fork on GitHub, and its clean local clone with the files git ignores in it */
export type ForkDeletePreview = Refusable<{ branches: number; clone: { ignoredFiles: string[]; path: string } | undefined; parent: string }>

/** What deleting a whole project would remove, shown before it is confirmed: its repo on GitHub, and its local clone with the unsaved work and the files git ignores, all lost for good */
export type ProjectDeletePreview = Refusable<{ clone: { ignoredFiles: string[]; path: string; unsaved: string[] } | undefined; repo: string | undefined }>

/** The planned change of one file, what the confirmation shows as a diff: `before` is empty when the file does not exist yet */
export interface FixPlan {
  /** The text once the fixes are applied */
  after: string
  /** The current text */
  before: string
  /** The file path, relative to the project folder */
  file: string
}

/** What applying the file fixes of a project would change, read fresh when the dialog opens: the fingerprint of that plan is sent back with the confirmation, and the fix is refused when the plan is not the same any more. A file with uncommitted changes gets the fix merged into those changes, it is listed in `merged` and is not part of the automatic commit. `installs` are the dev dependencies installed with the package manager of the project once the files are written */
export type FixPreview = Refusable<{ fingerprint: string; installs: string[]; merged: string[]; path: string; plans: FixPlan[] }>

/** What deleting the local branches would do, read fresh from the clone when the dialog opens: the fingerprint of the list is sent back with the confirmation, and the delete is refused when the list is not the same any more */
export type DeleteBranchesPreview = Refusable<{ branches: string[]; fingerprint: string; path: string }>

/** What the git fixes of a project would do, read fresh from the clone when the dialog opens: the fingerprint of that plan is sent back with the confirmation, and the fix is refused when the plan is not the same any more */
export type GitFixPreview = Refusable<{ branches: string[]; fastForward: string[]; fingerprint: string; path: string; pull: string | undefined; stashes: string[] }>
