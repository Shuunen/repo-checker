import type { MetadataPreview, MetadataValues } from '../../shared/action.ts'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { SyncGithubMetadataBody } from './sync-github-metadata-body.tsx'

/** What the dialog shows and does */
interface SyncGithubMetadataDialogProps {
  /** Why the copy failed after it was confirmed, undefined before */
  error: string | undefined
  /** True while the server reads GitHub and the package.json again */
  isLoading: boolean
  /** True when the dialog is shown */
  isOpen: boolean
  /** True while the server sets the values */
  isPending: boolean
  /** Close the dialog without copying */
  onCancel: () => void
  /** Called with the values when the user edits one */
  onChange: (values: MetadataValues) => void
  /** Copy */
  onConfirm: () => void
  /** Called with the new state when the dialog opens or closes */
  onOpenChange: (isOpen: boolean) => void
  /** What the server found, undefined before the answer */
  preview: MetadataPreview | undefined
  /** Why the server could not be asked, undefined when it answered */
  previewError: string | undefined
  /** The `owner/name` of the repo */
  slug: string
  /** The values in the inputs */
  values: MetadataValues
}

/**
 * The confirmation before the description and the homepage are synced: what the project and GitHub have now, and the values to write on GitHub and in the project in inputs the user can edit. Nothing happens until Sync is pressed, and it is only possible when a value differs from what one of them has
 * @param props the props
 * @param props.error why the copy failed
 * @param props.isLoading true while the server reads again
 * @param props.isOpen true when the dialog is shown
 * @param props.isPending true while copying
 * @param props.onCancel closes the dialog
 * @param props.onChange called with the values when the user edits one
 * @param props.onConfirm copies
 * @param props.onOpenChange called when the dialog opens or closes
 * @param props.preview what the server found
 * @param props.previewError why the server could not be asked
 * @param props.slug the `owner/name` of the repo
 * @param props.values the values in the inputs
 * @returns the dialog
 */
export function SyncGithubMetadataDialog({ error, isLoading, isOpen, isPending, onCancel, onChange, onConfirm, onOpenChange, preview, previewError, slug, values }: Readonly<SyncGithubMetadataDialogProps>) {
  const isChanged = preview?.ok === true && [preview.github, preview.local].some(current => values.description.trim() !== current.description || values.homepage.trim() !== current.homepage)
  return (
    <ConfirmDialog canConfirm={isChanged && !isLoading} confirmLabel="Sync" heading={`Sync the infos of ${slug}?`} isDanger={false} isOpen={isOpen} isPending={isPending} isWide onCancel={onCancel} onConfirm={onConfirm} onOpenChange={onOpenChange} prefix="sync-github-metadata">
      <SyncGithubMetadataBody error={error} isLoading={isLoading} onChange={onChange} preview={preview} previewError={previewError} values={values} />
    </ConfirmDialog>
  )
}
