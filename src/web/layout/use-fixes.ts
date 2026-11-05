import { useState } from 'react'
import type { GitFixPreview } from '../../shared/action.ts'
import { type ActionDialog, type DialogControls, useActionDialog } from './use-action-dialog.ts'
import { type FixFilesDialog, useFixFiles } from './use-fix-files.ts'

/**
 * Run the git fixes, then the file fixes, each one only when its plan offers it, so the files are written on a clone that is up to date
 * @param files the dialog of the file fixes
 * @param git the dialog of the git fixes
 * @returns true once both ran, false when one failed, its reason is shown by its own part of the dialog
 */
async function confirmBoth(files: Readonly<FixFilesDialog>, git: Readonly<ActionDialog<GitFixPreview>>) {
  try {
    if (git.preview?.ok === true) await git.confirm()
    if (files.preview?.ok === true) await files.confirm()
    return true
  } catch {
    return false
  }
}

/**
 * The dialogs of the fixes: the file fixes, the git fixes, and the one that fixes everything. That one opens the plans of the git fixes and of the file fixes together, and confirming runs the git fixes first, then the file fixes. A fix that has nothing to do is skipped, and the first one that fails stops the rest
 * @param name the repo name
 * @returns the three dialogs, what opens the one of everything, and the notice of a prevented commit
 * @example const { all, files, git } = useFixes('jozzo')
 */
export function useFixes(name: string) {
  const fix = useFixFiles(name)
  const files = fix.dialog
  const git = useActionDialog<GitFixPreview>(name, 'fix-git')
  const [isOpen, setIsOpen] = useState(false)
  const handleClose = () => {
    setIsOpen(false)
    git.handleClose()
    files.handleClose()
  }
  const all: DialogControls = {
    canConfirm: (files.preview?.ok === true || git.preview?.ok === true) && !files.isLoading && !git.isLoading,
    handleClose,
    handleConfirm: () => void confirmBoth(files, git).then(isDone => isDone && setIsOpen(false)),
    handleOpenChange: setIsOpen,
    isOpen,
    isPending: files.isPending || git.isPending,
  }
  const handleOpenAll = () => {
    setIsOpen(true)
    git.handleOpen()
    files.handleOpen()
  }
  return { all, commitBlocked: fix.commitBlocked, files, git, handleCommitBlockedClose: fix.handleCommitBlockedClose, handleOpenAll }
}
