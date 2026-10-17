import { ConfirmDialog } from './confirm-dialog.tsx'
import { DiscardBody, type DiscardBodyProps } from './discard-body.tsx'

/** What the dialog shows and does, with the props of its body */
interface DiscardDialogProps extends DiscardBodyProps {
  /** True when the dialog is shown */
  isOpen: boolean
  /** True while the server discards */
  isPending: boolean
  /** Close the dialog without discarding */
  onCancel: () => void
  /** Discard */
  onConfirm: () => void
  /** Called with the new state when the dialog opens or closes */
  onOpenChange: (isOpen: boolean) => void
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The confirmation before a discard: the server reads, fresh, the exact list of what would be thrown away, and Discard is only possible once it did. The discard is refused if the clone holds anything else when it is pressed
 * @param props the props
 * @param props.error why the discard failed after it was confirmed
 * @param props.isLoading true while the list is read again
 * @param props.isOpen true when the dialog is shown
 * @param props.isPending true while discarding
 * @param props.onCancel closes the dialog
 * @param props.onConfirm discards
 * @param props.onOpenChange called when the dialog opens or closes
 * @param props.preview what the server found
 * @param props.previewError why the server could not be asked
 * @param props.slug the `owner/name` of the repo
 * @returns the dialog
 */
export function DiscardDialog({ error, isLoading, isOpen, isPending, onCancel, onConfirm, onOpenChange, preview, previewError, slug }: Readonly<DiscardDialogProps>) {
  return (
    <ConfirmDialog
      isWide={false}
      canConfirm={preview?.ok === true && !isLoading}
      confirmLabel="Discard everything listed"
      heading={`Discard the unsaved work of ${slug}?`}
      isDanger
      isOpen={isOpen}
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      prefix="discard"
    >
      <DiscardBody error={error} isLoading={isLoading} preview={preview} previewError={previewError} />
    </ConfirmDialog>
  )
}
