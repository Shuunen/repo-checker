import { ConfirmDialog } from './confirm-dialog.tsx'

/** What the dialog shows and does */
interface ArchiveDialogProps {
  /** Archive or unarchive */
  action: 'archive' | 'unarchive'
  /** Why the archive was refused or failed, undefined before */
  error: string | undefined
  /** True when the dialog is shown */
  isOpen: boolean
  /** True while the server archives */
  isPending: boolean
  /** Close the dialog without archiving */
  onCancel: () => void
  /** Archive */
  onConfirm: () => void
  /** Called with the new state when the dialog opens or closes */
  onOpenChange: (isOpen: boolean) => void
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The confirmation before archiving or unarchiving a repo on GitHub: what it changes, and why it failed if it did. Nothing happens until Archive is pressed
 * @param props the props
 * @param props.action archive or unarchive
 * @param props.error why the archive failed, undefined before
 * @param props.isOpen true when the dialog is shown
 * @param props.isPending true while archiving
 * @param props.onCancel closes the dialog
 * @param props.onConfirm archives
 * @param props.onOpenChange called when the dialog opens or closes
 * @param props.slug the `owner/name` of the repo
 * @returns the dialog
 */
export function ArchiveDialog({ action, error, isOpen, isPending, onCancel, onConfirm, onOpenChange, slug }: Readonly<ArchiveDialogProps>) {
  const isArchiving = action === 'archive'
  return (
    <ConfirmDialog
      canConfirm
      confirmLabel={isArchiving ? 'Archive' : 'Unarchive'}
      heading={`${isArchiving ? 'Archive' : 'Unarchive'} ${slug}?`}
      isDanger={false}
      isOpen={isOpen}
      isPending={isPending}
      isWide={false}
      onCancel={onCancel}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      prefix={action}
    >
      {isArchiving ? `${slug} becomes read-only on GitHub. Nothing is deleted, and it can be unarchived.` : `${slug} becomes writable again on GitHub, it is not archived any more.`}
      {error !== undefined && <p data-testid={`${action}-error`}>{error}</p>}
    </ConfirmDialog>
  )
}
