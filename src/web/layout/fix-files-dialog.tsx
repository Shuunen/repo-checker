import type { FixStage } from '../../shared/action.ts'
import { CommitToggle } from './commit-toggle.tsx'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { FixFilesBody, type FixFilesBodyProps } from './fix-files-body.tsx'

/** What the dialog shows and does, with the props of its body */
export interface FixFilesDialogState extends FixFilesBodyProps {
  /** True to commit the fixes once written */
  isCommit: boolean
  /** True when the dialog is shown */
  isOpen: boolean
  /** True while the server writes the files */
  isPending: boolean
  /** Close the dialog without writing anything */
  onCancel: () => void
  /** Write the fixes */
  onConfirm: () => void
  /** Called with the new state of the auto commit toggle */
  onCommitChange: (isCommit: boolean) => void
  /** Called with the new state when the dialog opens or closes */
  onOpenChange: (isOpen: boolean) => void
  /** The step the fix is in while it runs, undefined before it is confirmed */
  stage: FixStage | undefined
}

/** What the dialog is given */
interface FixFilesDialogProps {
  /** The `owner/name` of the repo */
  slug: string
  /** What the dialog shows and does */
  state: FixFilesDialogState
}

/**
 * The confirmation before the file fixes: the server plans them again on the files as they are now and shows a diff per file, and Apply is only possible once it did. The fix is refused if the plan is not the one shown when it is pressed. Nothing is written until then
 * @param props the props
 * @param props.slug the `owner/name` of the repo
 * @param props.state what the dialog shows and does
 * @returns the dialog
 */
export function FixFilesDialog({ slug, state }: Readonly<FixFilesDialogProps>) {
  const { error, isCommit, isLoading, isOpen, isPending, onCancel, onCommitChange, onConfirm, onOpenChange, preview, previewError, stage } = state
  return (
    <ConfirmDialog
      canConfirm={preview?.ok === true && !isLoading}
      confirmLabel="Apply the fixes"
      footerStart={stage === undefined ? <CommitToggle isCommit={isCommit} onChange={onCommitChange} /> : undefined}
      heading={`Fix the files of ${slug}?`}
      isDanger={false}
      isOpen={isOpen}
      isPending={isPending}
      isWide
      onCancel={onCancel}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      prefix="fix"
    >
      <FixFilesBody error={error} isLoading={isLoading} preview={preview} previewError={previewError} stage={stage} />
    </ConfirmDialog>
  )
}
