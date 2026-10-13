import { ConfirmDialog } from './confirm-dialog.tsx'
import { DeleteForkBody, type DeleteForkBodyProps } from './delete-fork-body.tsx'

/** What the dialog shows and does, with the props of its body */
interface DeleteForkDialogProps extends DeleteForkBodyProps {
  /** True when the dialog is shown */
  isOpen: boolean
  /** True while the server deletes */
  isPending: boolean
  /** Close the dialog without deleting */
  onCancel: () => void
  /** Delete the fork */
  onConfirm: () => void
  /** Called with the new state when the dialog opens or closes */
  onOpenChange: (isOpen: boolean) => void
}

/**
 * The confirmation before a fork delete: the server proves again, from GitHub, that the fork is pristine and that the token may delete, and Delete is only possible once it did. Nothing is deleted until Delete is pressed
 * @param props the props
 * @param props.error why the delete failed after it was confirmed
 * @param props.isLoading true while the proof is redone
 * @param props.isOpen true when the dialog is shown
 * @param props.isPending true while deleting
 * @param props.onCancel closes the dialog
 * @param props.onConfirm deletes the fork
 * @param props.onOpenChange called when the dialog opens or closes
 * @param props.preview what the server found
 * @param props.previewError why the server could not be asked
 * @param props.slug the `owner/name` of the fork
 * @returns the dialog
 */
export function DeleteForkDialog({ error, isLoading, isOpen, isPending, onCancel, onConfirm, onOpenChange, preview, previewError, slug }: Readonly<DeleteForkDialogProps>) {
  return (
    <ConfirmDialog canConfirm={preview?.ok === true && !isLoading} confirmLabel="Delete the fork" heading={`Delete the fork ${slug}?`} isDanger isOpen={isOpen} isPending={isPending} onCancel={onCancel} onConfirm={onConfirm} onOpenChange={onOpenChange} prefix="fork">
      <DeleteForkBody error={error} isLoading={isLoading} preview={preview} previewError={previewError} slug={slug} />
    </ConfirmDialog>
  )
}
