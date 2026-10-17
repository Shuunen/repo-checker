import { ConfirmDialog } from './confirm-dialog.tsx'
import { FixGitBody, type FixGitBodyProps } from './fix-git-body.tsx'

/** What the dialog shows and does, with the props of its body */
export interface FixGitDialogState extends FixGitBodyProps {
  /** True when the dialog is shown */
  isOpen: boolean
  /** True while the server runs the fixes */
  isPending: boolean
  /** Close the dialog without changing anything */
  onCancel: () => void
  /** Run the fixes */
  onConfirm: () => void
  /** Called with the new state when the dialog opens or closes */
  onOpenChange: (isOpen: boolean) => void
}

/**
 * The confirmation before the git fixes: the server plans them again on the clone as it is now, and the fix is refused if the plan is not the one shown when it is pressed. Nothing changes until then
 * @param props the props
 * @param props.slug the `owner/name` of the repo
 * @param props.state what the dialog shows and does
 * @returns the dialog
 */
export function FixGitDialog({ slug, state }: Readonly<{ slug: string; state: FixGitDialogState }>) {
  const { error, isLoading, isOpen, isPending, onCancel, onConfirm, onOpenChange, preview, previewError } = state
  return (
    <ConfirmDialog
      canConfirm={preview?.ok === true && !isLoading}
      confirmLabel="Fix the git issues"
      heading={`Fix the git issues of ${slug}?`}
      isDanger={false}
      isOpen={isOpen}
      isPending={isPending}
      isWide={false}
      onCancel={onCancel}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      prefix="fix-git"
    >
      <FixGitBody error={error} isLoading={isLoading} preview={preview} previewError={previewError} />
    </ConfirmDialog>
  )
}
