import { useState } from 'react'
import type { FixPreview, FixStage } from '../../shared/action.ts'
import type { FixFilesDialogState } from './fix-files-dialog.tsx'
import { usePreviewedDialog } from './use-previewed-dialog.ts'

/**
 * The dialog of the file fixes, with its auto commit toggle (on by default), the step the fix is in while it runs, and the output of the check that prevented the automatic commit, kept until the user closes the notice
 * @param name the repo name
 * @returns the state of the dialog, which opens it, and the notice of a prevented commit
 * @example const fix = useFixFiles('jozzo')
 */
export function useFixFiles(name: string) {
  const [isCommit, setIsCommit] = useState(true)
  const [commitBlocked, setCommitBlocked] = useState<string>()
  const [stage, setStage] = useState<FixStage>()
  const dialog = usePreviewedDialog<FixPreview>(name, 'fix-files', { fingerprintOf: preview => preview.fingerprint, isCommit, onDone: setCommitBlocked, onStage: setStage })
  const handleConfirm = () => {
    setStage('writing')
    dialog.handleConfirm()
  }
  const confirm = () => {
    setStage('writing')
    return dialog.confirm()
  }
  const { error, isLoading, isOpen, isPending, preview, previewError } = dialog
  const dialogState: FixFilesDialogState = { error, isCommit, isLoading, isOpen, isPending, onCancel: dialog.handleClose, onCommitChange: setIsCommit, onConfirm: handleConfirm, onOpenChange: dialog.handleOpenChange, preview, previewError, stage: isPending ? stage : undefined }
  return { commitBlocked, confirm, dialogState, handleClose: dialog.handleClose, handleCommitBlockedClose: () => setCommitBlocked(undefined), handleOpen: dialog.handleOpen }
}
