import type { ActionResult, DeletePreview, DiscardPreview, FixPreview, ForkDeletePreview, ProjectDeletePreview } from '../../shared/action.ts'
import type { RescanResult } from '../../shared/scan-event.ts'

/** The actions the page can ask for, each one proves again that it is still safe before it acts */
export interface Actions {
  /** Archive the repo on GitHub, after proving again that it is there and not archived yet */
  archive: (name: string) => Promise<ActionResult>
  /** Check out the default branch of the repo in its clone, refused when the clone has uncommitted files */
  checkoutDefault: (name: string) => Promise<ActionResult>
  /** Clone a repo of the owner into the folder of projects */
  clone: (name: string) => Promise<ActionResult>
  /** Delete the local clone of an archived repo, after proving again that it holds nothing that is not on GitHub */
  deleteClone: (name: string) => Promise<ActionResult>
  /** Say what deleting that clone would remove, the files git ignores, or why it is refused */
  previewDeleteClone: (name: string) => Promise<DeletePreview>
  /** Delete a pristine fork on GitHub, and its clean local clone if it has one */
  deleteFork: (name: string) => Promise<ActionResult>
  /** Delete a project for good: its repo on GitHub and its local clone, whatever they hold */
  deleteProject: (name: string) => Promise<ActionResult>
  /** Say what deleting the project would remove, the unsaved work of its clone included */
  previewDeleteProject: (name: string) => Promise<ProjectDeletePreview>
  /** Write the file fixes the checks plan, refused unless the plan is the one the fingerprint stands for, and never over a file with uncommitted changes */
  fixFiles: (name: string, fingerprint: string) => Promise<ActionResult>
  /** Throw away the unsaved work of an archived repo's clone, refused unless it is exactly the work the fingerprint stands for */
  discard: (name: string, fingerprint: string) => Promise<ActionResult>
  /** Say what deleting the fork would remove, after proving it is pristine */
  previewDeleteFork: (name: string) => Promise<ForkDeletePreview>
  /** Say what the file fixes would change: a before and after per file, with the fingerprint of that plan */
  previewFixFiles: (name: string) => Promise<FixPreview>
  /** Say what discarding would throw away, with the fingerprint of that list */
  previewDiscard: (name: string) => Promise<DiscardPreview>
  /** Copy the description and the homepage of package.json to the repo on GitHub, only for what GitHub has none */
  syncGithubMetadata: (name: string) => Promise<ActionResult>
  /** Scan one project again, after an action changed it, so the page does not scan everything again */
  rescan: (name: string) => Promise<RescanResult>
  /** Unarchive the repo on GitHub, after proving again that it is there and archived */
  unarchive: (name: string) => Promise<ActionResult>
  /** Unarchive an archived repo, push the unsaved branches of its clone, archive it again */
  unarchivePush: (name: string) => Promise<ActionResult>
}
