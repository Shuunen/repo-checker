import { useState } from 'react'
import type { useFixFiles } from './use-fix-files.ts'
import type { useFixGit } from './use-fix-git.ts'

/**
 * The dialog that fixes everything: it opens the plans of the git fixes and of the file fixes together, and confirming runs the git fixes first, so the files are written on a clone that is up to date, then the file fixes. A fix that has nothing to do is skipped, and the first one that fails stops the rest, its reason is shown by its own part of the dialog
 * @param files the file fixes
 * @param git the git fixes
 * @returns whether the dialog is shown, and what opens, cancels and confirms it
 * @example const all = useFixAll(useFixFiles('jozzo'), useFixGit('jozzo'))
 */
export function useFixAll(files: ReturnType<typeof useFixFiles>, git: ReturnType<typeof useFixGit>) {
  const [isAll, setIsAll] = useState(false)
  const handleOpen = () => {
    setIsAll(true)
    git.handleOpen()
    files.handleOpen()
  }
  const handleCancel = () => {
    setIsAll(false)
    git.handleClose()
    files.handleClose()
  }
  const handleConfirm = async () => {
    try {
      if (git.dialogState.preview?.ok === true) await git.confirm()
      if (files.dialogState.preview?.ok === true) await files.confirm()
      setIsAll(false)
    } catch {
      // the reason is shown by the body of the fix that failed
    }
  }
  return { handleCancel, handleConfirm, handleOpen, handleOpenChange: setIsAll, isAll }
}
