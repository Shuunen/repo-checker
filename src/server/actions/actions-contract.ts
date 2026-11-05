import type { ActionResult, DeleteBranchesPreview, DeletePreview, DiscardPreview, FixPreview, FixStage, GitFixPreview, ForkDeletePreview, MetadataPreview, MetadataValues, ProjectDeletePreview } from '../../shared/action.ts'
import type { ChatEvent } from '../../shared/claude.ts'
import type { LiveResult, RescanResult } from '../../shared/scan-event.ts'

/** How the file fixes run */
interface FixRun {
  /** True to commit and push the written files once the check of the project passes */
  commit?: boolean
  /** Called when the fix enters a step */
  onStage?: ((stage: FixStage) => void) | undefined
}

/** The actions the page can ask for, each one proves again that it is still safe before it acts */
export interface Actions {
  /** Archive the repo on GitHub, after proving again that it is there and not archived yet */
  archive: (name: string) => Promise<ActionResult>
  /** Close the Claude session of the project, which stops Claude, it works whether it still ran or not */
  closeUpdateProject: (name: string) => Promise<ActionResult>
  /** Check out the default branch of the repo in its clone, refused when the clone has uncommitted files */
  checkoutDefault: (name: string) => Promise<ActionResult>
  /** Clone a repo of the owner into the folder of projects */
  clone: (name: string) => Promise<ActionResult>
  /** Delete the local clone of an archived repo, after proving again that it holds nothing that is not on GitHub */
  deleteClone: (name: string) => Promise<ActionResult>
  /** Watch a project: say that nothing changed since the fingerprint the page holds, or give the project as it is now. A change of the clone is checked again at once, GitHub is read again only when its data is old */
  live: (name: string, since: string) => Promise<LiveResult>
  /** Say what deleting that clone would remove, the files git ignores, or why it is refused */
  previewDeleteClone: (name: string) => Promise<DeletePreview>
  /** Delete the local branches but the default one and the checked out one, refused unless the list is the one the fingerprint stands for */
  deleteBranches: (name: string, fingerprint: string) => Promise<ActionResult>
  /** Say which local branches would be deleted, with the fingerprint of that list */
  previewDeleteBranches: (name: string) => Promise<DeleteBranchesPreview>
  /** Delete a pristine fork on GitHub, and its clean local clone if it has one */
  deleteFork: (name: string) => Promise<ActionResult>
  /** Delete a project for good: its repo on GitHub and its local clone, whatever they hold */
  deleteProject: (name: string) => Promise<ActionResult>
  /** Say what deleting the project would remove, the unsaved work of its clone included */
  previewDeleteProject: (name: string) => Promise<ProjectDeletePreview>
  /** Write the file fixes the checks plan, refused unless the plan is the one the fingerprint stands for, and never over a file with uncommitted changes. The written files are committed and pushed when asked */
  fixFiles: (name: string, fingerprint: string, run?: FixRun) => Promise<ActionResult>
  /** Delete the local branches without upstream, drop the stashes and pull the default branch when it is behind, refused unless the plan is the one the fingerprint stands for */
  fixGit: (name: string, fingerprint: string) => Promise<ActionResult>
  /** Say what the git fixes would do, with the fingerprint of that plan */
  previewFixGit: (name: string) => Promise<GitFixPreview>
  /** Throw away the unsaved work of an archived repo's clone, refused unless it is exactly the work the fingerprint stands for */
  discard: (name: string, fingerprint: string) => Promise<ActionResult>
  /** Say what deleting the fork would remove, after proving it is pristine */
  previewDeleteFork: (name: string) => Promise<ForkDeletePreview>
  /** Say what the file fixes would change: a before and after per file, with the fingerprint of that plan */
  previewFixFiles: (name: string) => Promise<FixPreview>
  /** Send a message of the user to the Claude session of the project */
  sendUpdateMessage: (name: string, text: string) => Promise<ActionResult>
  /** Start Claude on the update skill in the clone of the project, refused when it has no usable clone or already has a session that runs */
  startUpdateProject: (name: string) => Promise<ActionResult>
  /** Close every Claude session, when the server stops */
  stopSessions: () => void
  /** Follow the Claude session of the project: the conversation so far, then each new event. Gives a function that stops following, undefined when the project has no session */
  watchUpdateProject: (name: string, listener: (event: ChatEvent) => void) => (() => void) | undefined
  /** Say what discarding would throw away, with the fingerprint of that list */
  previewDiscard: (name: string) => Promise<DiscardPreview>
  /** Say what copying the infos of package.json to GitHub would set: what GitHub has now and the proposed values */
  previewSyncGithubMetadata: (name: string) => Promise<MetadataPreview>
  /** Set the description and the homepage the user confirmed on the repo on GitHub, only the ones that changed */
  syncGithubMetadata: (name: string, values: MetadataValues) => Promise<ActionResult>
  /** Scan one project again, after an action changed it, so the page does not scan everything again */
  rescan: (name: string) => Promise<RescanResult>
  /** Unarchive the repo on GitHub, after proving again that it is there and archived */
  unarchive: (name: string) => Promise<ActionResult>
  /** Unarchive an archived repo, push the unsaved branches of its clone, archive it again */
  unarchivePush: (name: string) => Promise<ActionResult>
}
