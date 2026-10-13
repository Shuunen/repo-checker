import { ConfirmDialog } from './confirm-dialog.tsx'
import { FixFilesBody, type FixFilesBodyProps } from './fix-files-body.tsx'

/** What the dialog shows and does, with the props of its body */
interface FixFilesDialogProps extends FixFilesBodyProps {
  /** True when the dialog is shown */
  isOpen: boolean
  /** True while the server writes the files */
  isPending: boolean
  /** Close the dialog without writing anything */
  onCancel: () => void
  /** Write the fixes */
  onConfirm: () => void
  /** Called with the new state when the dialog opens or closes */
  onOpenChange: (isOpen: boolean) => void
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The confirmation before the file fixes: the server plans them again on the files as they are now and shows a diff per file, and Apply is only possible once it did. The fix is refused if the plan is not the one shown when it is pressed. Nothing is written until then
 * @param props the props
 * @param props.error why the fix failed after it was confirmed
 * @param props.isLoading true while the plan is made again
 * @param props.isOpen true when the dialog is shown
 * @param props.isPending true while writing
 * @param props.onCancel closes the dialog
 * @param props.onConfirm writes the fixes
 * @param props.onOpenChange called when the dialog opens or closes
 * @param props.preview what the server found
 * @param props.previewError why the server could not be asked
 * @param props.slug the `owner/name` of the repo
 * @returns the dialog
 */
export function FixFilesDialog({ error, isLoading, isOpen, isPending, onCancel, onConfirm, onOpenChange, preview, previewError, slug }: Readonly<FixFilesDialogProps>) {
  return (
    <ConfirmDialog canConfirm={preview?.ok === true && !isLoading} confirmLabel="Apply the fixes" heading={`Fix the files of ${slug}?`} isDanger={false} isOpen={isOpen} isPending={isPending} isWide onCancel={onCancel} onConfirm={onConfirm} onOpenChange={onOpenChange} prefix="fix">
      <FixFilesBody error={error} isLoading={isLoading} preview={preview} previewError={previewError} />
    </ConfirmDialog>
  )
}
