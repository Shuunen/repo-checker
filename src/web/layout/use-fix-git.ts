import type { GitFixPreview } from '../../shared/action.ts'
import type { FixGitDialogState } from './fix-git-dialog.tsx'
import { usePreviewedDialog } from './use-previewed-dialog.ts'

/**
 * The dialog of the git fixes: the local branches without upstream to delete, the stashes to drop and the pull of the default branch
 * @param name the repo name
 * @returns the state of the dialog, which opens and closes it, and confirms it as a promise
 * @example const fix = useFixGit('jozzo')
 */
export function useFixGit(name: string) {
  const dialog = usePreviewedDialog<GitFixPreview>(name, 'fix-git', { fingerprintOf: preview => preview.fingerprint })
  const { error, isLoading, isOpen, isPending, preview, previewError } = dialog
  const dialogState: FixGitDialogState = { error, isLoading, isOpen, isPending, onCancel: dialog.handleClose, onConfirm: dialog.handleConfirm, onOpenChange: dialog.handleOpenChange, preview, previewError }
  return { confirm: dialog.confirm, dialogState, handleClose: dialog.handleClose, handleOpen: dialog.handleOpen }
}
