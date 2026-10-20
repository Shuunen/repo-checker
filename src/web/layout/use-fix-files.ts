import { useState } from 'react'
import type { FixPreview, FixStage } from '../../shared/action.ts'
import { type ActionDialog, useActionDialog } from './use-action-dialog.ts'

/** The dialog of the file fixes: the dialog of an action, with its auto commit toggle and the step the fix is in */
export interface FixFilesDialog extends ActionDialog<FixPreview> {
  /** Turn the auto commit on or off */
  handleCommitChange: (isCommit: boolean) => void
  /** True to commit and push the fixes once the check of the project passes */
  isCommit: boolean
  /** The step the fix is in while it runs, undefined before */
  stage: FixStage | undefined
}

/**
 * The dialog of the file fixes, with its auto commit toggle (on by default), the step the fix is in while it runs, and the output of the check that prevented the automatic commit, kept until the user closes the notice
 * @param name the repo name
 * @returns the dialog, and the notice of a prevented commit
 * @example const fix = useFixFiles('jozzo')
 */
export function useFixFiles(name: string) {
  const [isCommit, setIsCommit] = useState(true)
  const [commitBlocked, setCommitBlocked] = useState<string>()
  const [stage, setStage] = useState<FixStage>()
  const dialog = useActionDialog<FixPreview>(name, 'fix-files', { isCommit, onDone: setCommitBlocked, onStage: setStage })
  const fixDialog: FixFilesDialog = {
    ...dialog,
    confirm: () => {
      setStage('writing')
      return dialog.confirm()
    },
    handleCommitChange: setIsCommit,
    handleConfirm: () => {
      setStage('writing')
      dialog.handleConfirm()
    },
    isCommit,
    stage: dialog.isPending ? stage : undefined,
  }
  return { commitBlocked, dialog: fixDialog, handleCommitBlockedClose: () => setCommitBlocked(undefined) }
}
