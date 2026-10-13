import { AlertDialog, Button } from '@heroui/react'

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
 * The confirmation before a clone: what will happen, why it failed if it did, and Cancel and Clone. Nothing happens until Clone is pressed
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
    <AlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Heading>{`Clone ${slug}?`}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body data-testid="clone-dialog-body">
              {`${slug} is cloned into ${folder} with gh. Nothing that already exists is changed, and the clone is refused if a folder of that name appears before.`}
              {error !== undefined && <p data-testid="clone-error">{error}</p>}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button data-testid="clone-cancel" isDisabled={isPending} onPress={onCancel} variant="tertiary">
                Cancel
              </Button>
              <Button data-testid="clone-confirm" isPending={isPending} onPress={onConfirm}>
                Clone
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  )
}
