import { ConfirmDialog } from './confirm-dialog.tsx'

/** What the dialog shows and does */
interface SyncGithubMetadataDialogProps {
  /** Why the copy was refused or failed, undefined before */
  error: string | undefined
  /** True when the dialog is shown */
  isOpen: boolean
  /** True while the server copies */
  isPending: boolean
  /** Close the dialog without copying */
  onCancel: () => void
  /** Copy */
  onConfirm: () => void
  /** Called with the new state when the dialog opens or closes */
  onOpenChange: (isOpen: boolean) => void
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The confirmation before the description and the homepage of package.json are sent to GitHub: what will happen, and why it failed if it did. Nothing happens until Copy is pressed
 * @param props the props
 * @param props.error why the copy failed, undefined before
 * @param props.isOpen true when the dialog is shown
 * @param props.isPending true while copying
 * @param props.onCancel closes the dialog
 * @param props.onConfirm copies
 * @param props.onOpenChange called when the dialog opens or closes
 * @param props.slug the `owner/name` of the repo
 * @returns the dialog
 */
export function SyncGithubMetadataDialog({ error, isOpen, isPending, onCancel, onConfirm, onOpenChange, slug }: Readonly<SyncGithubMetadataDialogProps>) {
  return (
    <ConfirmDialog canConfirm confirmLabel="Copy" heading={`Copy to ${slug} on GitHub?`} isDanger={false} isOpen={isOpen} isPending={isPending} isWide={false} onCancel={onCancel} onConfirm={onConfirm} onOpenChange={onOpenChange} prefix="sync-github-metadata">
      {`The description and the homepage of the package.json of the clone are set on ${slug} on GitHub, only the one GitHub has none for. Nothing already set there is replaced, and it is refused when the package.json has nothing to copy.`}
      {error !== undefined && <p data-testid="sync-github-metadata-error">{error}</p>}
    </ConfirmDialog>
  )
}
