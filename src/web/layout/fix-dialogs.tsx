import { FixAllDialog } from './fix-all-dialog.tsx'
import { FixFilesDialog } from './fix-files-dialog.tsx'
import { FixGitDialog } from './fix-git-dialog.tsx'
import type { useFixAll } from './use-fix-all.ts'
import type { useFixFiles } from './use-fix-files.ts'
import type { useFixGit } from './use-fix-git.ts'

/** What the dialogs need */
interface FixDialogsProps {
  /** The fix of everything */
  all: ReturnType<typeof useFixAll>
  /** The file fixes */
  fix: ReturnType<typeof useFixFiles>
  /** The git fixes */
  git: ReturnType<typeof useFixGit>
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The confirmations of the fixes: the files, the git issues, or both in one dialog, in which case the two others stay closed
 * @param props the props
 * @param props.all the fix of everything
 * @param props.fix the file fixes
 * @param props.git the git fixes
 * @param props.slug the `owner/name` of the repo
 * @returns the dialogs
 */
export function FixDialogs({ all, fix, git, slug }: Readonly<FixDialogsProps>) {
  return (
    <>
      <FixFilesDialog slug={slug} state={{ ...fix.dialogState, isOpen: fix.dialogState.isOpen && !all.isAll }} />
      <FixGitDialog slug={slug} state={{ ...git.dialogState, isOpen: git.dialogState.isOpen && !all.isAll }} />
      <FixAllDialog files={fix.dialogState} git={git.dialogState} isOpen={all.isAll} onCancel={all.handleCancel} onConfirm={all.handleConfirm} onOpenChange={all.handleOpenChange} slug={slug} />
    </>
  )
}
