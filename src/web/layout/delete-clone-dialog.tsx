import { AlertDialog, Button } from '@heroui/react'
import { DeleteCloneBody, type DeleteCloneBodyProps } from './delete-clone-body.tsx'

/** What the dialog shows and does, the body props are the ones of `DeleteCloneBody` */
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
 * The confirmation before a delete: the server proves again that nothing would be lost and lists the ignored files that would be, and Delete is only possible once it did. Nothing is deleted until Delete is pressed
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
  const canDelete = preview?.ok === true && !isLoading
  return (
    <AlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Heading>{`Delete the local clone of ${slug}?`}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body data-testid="delete-dialog-body">
              <DeleteCloneBody error={error} isLoading={isLoading} preview={preview} previewError={previewError} />
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button data-testid="delete-cancel" isDisabled={isPending} onPress={onCancel} variant="tertiary">
                Cancel
              </Button>
              <Button data-testid="delete-confirm" isDisabled={!canDelete} isPending={isPending} onPress={onConfirm} variant="danger">
                Delete clone
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  )
}
