import { ConfirmDialog } from './confirm-dialog.tsx'
import { DeleteBranchesBody, type DeleteBranchesBodyProps } from './delete-branches-body.tsx'

/** What the dialog shows and does, with the props of its body */
interface DeleteBranchesDialogProps extends DeleteBranchesBodyProps {
  /** True when the dialog is shown */
  isOpen: boolean
  /** True while the server deletes */
  isPending: boolean
  /** Close the dialog without deleting */
  onCancel: () => void
  /** Delete the branches */
  onConfirm: () => void
  /** Called with the new state when the dialog opens or closes */
  onOpenChange: (isOpen: boolean) => void
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The confirmation before the delete of the local branches: the server lists them again on the clone as it is now, and the delete is refused if the list is not the one shown when it is pressed
 * @param props the props
 * @param props.error why the delete failed after it was confirmed
 * @param props.isLoading true while the list is made again
 * @param props.isOpen true when the dialog is shown
 * @param props.isPending true while deleting
 * @param props.onCancel closes the dialog
 * @param props.onConfirm deletes the branches
 * @param props.onOpenChange called when the dialog opens or closes
 * @param props.preview what the server found
 * @param props.previewError why the server could not be asked
 * @param props.slug the `owner/name` of the repo
 * @returns the dialog
 */
export function DeleteBranchesDialog({ error, isLoading, isOpen, isPending, onCancel, onConfirm, onOpenChange, preview, previewError, slug }: Readonly<DeleteBranchesDialogProps>) {
  return (
    <ConfirmDialog
      canConfirm={preview?.ok === true && !isLoading}
      confirmLabel="Delete branches"
      heading={`Delete the local branches of ${slug}?`}
      isDanger
      isOpen={isOpen}
      isPending={isPending}
      isWide={false}
      onCancel={onCancel}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      prefix="delete-branches"
    >
      <DeleteBranchesBody error={error} isLoading={isLoading} preview={preview} previewError={previewError} />
    </ConfirmDialog>
  )
}
