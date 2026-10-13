import type { LocalClone } from '../../shared/project.ts'
import { unsavedGroups } from '../../shared/unsaved.ts'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { UnsavedList } from './unsaved-list.tsx'

/** What the dialog shows and does */
interface UnarchivePushDialogProps {
  /** Why the action cannot run, undefined when it can */
  blocker: string | undefined
  /** Why the action failed after it was confirmed, undefined before */
  error: string | undefined
  /** True when the dialog is shown */
  isOpen: boolean
  /** True while the server runs the action */
  isPending: boolean
  /** The clone, its unsaved work is listed */
  local: LocalClone
  /** Close the dialog without running the action */
  onCancel: () => void
  /** Run the action */
  onConfirm: () => void
  /** Called with the new state when the dialog opens or closes */
  onOpenChange: (isOpen: boolean) => void
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The confirmation before saving the unsaved work of an archived repo: what happens in which order, the work that is pushed, and why it cannot run when it cannot. Nothing happens until the button is pressed
 * @param props the props
 * @param props.blocker why the action cannot run
 * @param props.error why the action failed
 * @param props.isOpen true when the dialog is shown
 * @param props.isPending true while the action runs
 * @param props.local the clone
 * @param props.onCancel closes the dialog
 * @param props.onConfirm runs the action
 * @param props.onOpenChange called when the dialog opens or closes
 * @param props.slug the `owner/name` of the repo
 * @returns the dialog
 */
export function UnarchivePushDialog({ blocker, error, isOpen, isPending, local, onCancel, onConfirm, onOpenChange, slug }: Readonly<UnarchivePushDialogProps>) {
  return (
    <ConfirmDialog canConfirm={blocker === undefined} confirmLabel="Unarchive, push, archive again" heading={`Save the unsaved work of ${slug}?`} isDanger={false} isOpen={isOpen} isPending={isPending} onCancel={onCancel} onConfirm={onConfirm} onOpenChange={onOpenChange} prefix="unarchive">
      <p>{`GitHub rejects a push to an archived repo, so ${slug} is unarchived, these branches are pushed without creating any commit, then it is archived again, even if the push fails. It is writable for a few seconds.`}</p>
      <UnsavedList groups={unsavedGroups(local)} />
      {blocker !== undefined && <p data-testid="unarchive-blocker">{blocker}</p>}
      {error !== undefined && <p data-testid="unarchive-error">{error}</p>}
    </ConfirmDialog>
  )
}
