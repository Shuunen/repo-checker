import type { ActionResult, DeletePreview, DiscardPreview, ForkDeletePreview } from '../../shared/action.ts'
import type { RescanResult } from '../../shared/scan-event.ts'

/** The actions the page can ask for, each one proves again that it is still safe before it acts */
export interface Actions {
  /** Clone a repo of the owner into the folder of projects */
  clone: (name: string) => Promise<ActionResult>
  /** Delete the local clone of an archived repo, after proving again that it holds nothing that is not on GitHub */
  deleteClone: (name: string) => Promise<ActionResult>
  /** Say what deleting that clone would remove, the files git ignores, or why it is refused */
  previewDeleteClone: (name: string) => Promise<DeletePreview>
  /** Delete a pristine fork on GitHub, and its clean local clone if it has one */
  deleteFork: (name: string) => Promise<ActionResult>
  /** Throw away the unsaved work of an archived repo's clone, refused unless it is exactly the work the fingerprint stands for */
  discard: (name: string, fingerprint: string) => Promise<ActionResult>
  /** Say what deleting the fork would remove, after proving it is pristine */
  previewDeleteFork: (name: string) => Promise<ForkDeletePreview>
  /** Say what discarding would throw away, with the fingerprint of that list */
  previewDiscard: (name: string) => Promise<DiscardPreview>
  /** Scan one project again, after an action changed it, so the page does not scan everything again */
  rescan: (name: string) => Promise<RescanResult>
  /** Unarchive an archived repo, push the unsaved branches of its clone, archive it again */
  unarchivePush: (name: string) => Promise<ActionResult>
}
