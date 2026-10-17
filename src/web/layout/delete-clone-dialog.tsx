import { ConfirmDialog } from './confirm-dialog.tsx'
import { DeleteCloneBody, type DeleteCloneBodyProps } from './delete-clone-body.tsx'

/** What the dialog shows and does, with the props of its body */
interface DeleteCloneDialogProps extends DeleteCloneBodyProps {
  /** True when the dialog is shown */
  isOpen: boolean
  /** True while the server deletes */
  isPending: boolean
  /** Close the dialog without deleting */
  onCancel: () => void
  /** Delete the clone */
  onConfirm: () => void
  /** Called with the new state when the dialog opens or closes */
  onOpenChange: (isOpen: boolean) => void
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The confirmation before a delete: the server proves again that nothing would be lost and lists the ignored files that would be, and Delete is only possible once it did
 * @param props the props
 * @param props.error why the delete failed after it was confirmed
 * @param props.isLoading true while the proof is redone
 * @param props.isOpen true when the dialog is shown
 * @param props.isPending true while deleting
 * @param props.onCancel closes the dialog
 * @param props.onConfirm deletes the clone
 * @param props.onOpenChange called when the dialog opens or closes
 * @param props.preview what the server found
 * @param props.previewError why the server could not be asked
 * @param props.slug the `owner/name` of the repo
 * @returns the dialog
 */
export function DeleteCloneDialog({ error, isLoading, isOpen, isPending, onCancel, onConfirm, onOpenChange, preview, previewError, slug }: Readonly<DeleteCloneDialogProps>) {
  return (
    <ConfirmDialog isWide={false} canConfirm={preview?.ok === true && !isLoading} confirmLabel="Delete clone" heading={`Delete the local clone of ${slug}?`} isDanger isOpen={isOpen} isPending={isPending} onCancel={onCancel} onConfirm={onConfirm} onOpenChange={onOpenChange} prefix="delete">
      <DeleteCloneBody error={error} isLoading={isLoading} preview={preview} previewError={previewError} />
    </ConfirmDialog>
  )
}
