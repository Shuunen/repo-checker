import { ConfirmDialog } from './confirm-dialog.tsx'

/** What the dialog shows and does */
interface CloneDialogProps {
  /** Why the clone was refused or failed, undefined before */
  error: string | undefined
  /** The folder the clone would create */
  folder: string
  /** True when the dialog is shown */
  isOpen: boolean
  /** True while the server clones */
  isPending: boolean
  /** Close the dialog without cloning */
  onCancel: () => void
  /** Clone */
  onConfirm: () => void
  /** Called with the new state when the dialog opens or closes */
  onOpenChange: (isOpen: boolean) => void
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The confirmation before a clone: what will happen, and why it failed if it did. Nothing happens until Clone is pressed
 * @param props the props
 * @param props.error why the clone failed, undefined before
 * @param props.folder the folder the clone creates
 * @param props.isOpen true when the dialog is shown
 * @param props.isPending true while cloning
 * @param props.onCancel closes the dialog
 * @param props.onConfirm clones
 * @param props.onOpenChange called when the dialog opens or closes
 * @param props.slug the `owner/name` of the repo
 * @returns the dialog
 */
export function CloneDialog({ error, folder, isOpen, isPending, onCancel, onConfirm, onOpenChange, slug }: Readonly<CloneDialogProps>) {
  return (
    <ConfirmDialog canConfirm confirmLabel="Clone" heading={`Clone ${slug}?`} isDanger={false} isOpen={isOpen} isPending={isPending} onCancel={onCancel} onConfirm={onConfirm} onOpenChange={onOpenChange} prefix="clone">
      {`${slug} is cloned over SSH into ${folder}. Nothing that already exists is changed, and the clone is refused if a folder of that name appears before.`}
      {error !== undefined && <p data-testid="clone-error">{error}</p>}
    </ConfirmDialog>
  )
}
