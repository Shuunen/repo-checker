import { ConfirmDialog } from './confirm-dialog.tsx'
import { DeleteProjectBody, type DeleteProjectBodyProps } from './delete-project-body.tsx'

/** What the dialog shows and does, with the props of its body */
interface DeleteProjectDialogProps extends DeleteProjectBodyProps {
  /** True when the dialog is shown */
  isOpen: boolean
  /** True while the server deletes */
  isPending: boolean
  /** Close the dialog without deleting */
  onCancel: () => void
  /** Delete the project */
  onConfirm: () => void
  /** Called with the new state when the dialog opens or closes */
  onOpenChange: (isOpen: boolean) => void
  /** The `owner/name` of the project */
  slug: string
}

/**
 * The confirmation before a project delete: it says what is lost for good, the repo on GitHub, the clone, its unsaved work and its ignored files. Nothing is deleted until Delete is pressed
 * @param props the props
 * @param props.error why the delete failed after it was confirmed
 * @param props.isLoading true while the server reads
 * @param props.isOpen true when the dialog is shown
 * @param props.isPending true while deleting
 * @param props.onCancel closes the dialog
 * @param props.onConfirm deletes the project
 * @param props.onOpenChange called when the dialog opens or closes
 * @param props.preview what the server found
 * @param props.previewError why the server could not be asked
 * @param props.slug the `owner/name` of the project
 * @returns the dialog
 */
export function DeleteProjectDialog({ error, isLoading, isOpen, isPending, onCancel, onConfirm, onOpenChange, preview, previewError, slug }: Readonly<DeleteProjectDialogProps>) {
  return (
    <ConfirmDialog isWide={false} canConfirm={preview?.ok === true && !isLoading} confirmLabel="Delete the project" heading={`Delete ${slug} for good?`} isDanger isOpen={isOpen} isPending={isPending} onCancel={onCancel} onConfirm={onConfirm} onOpenChange={onOpenChange} prefix="project">
      <DeleteProjectBody error={error} isLoading={isLoading} preview={preview} previewError={previewError} />
    </ConfirmDialog>
  )
}
