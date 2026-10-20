import type { GitFixPreview } from '../../shared/action.ts'
import { FixAllDialog } from './fix-all-dialog.tsx'
import { FixFilesDialog } from './fix-files-dialog.tsx'
import { FixGitDialog } from './fix-git-dialog.tsx'
import type { ActionDialog, DialogControls } from './use-action-dialog.ts'
import type { FixFilesDialog as FixFilesState } from './use-fix-files.ts'

/** The dialogs of the fixes */
interface FixDialogsProps {
  /** The controls of the dialog that fixes everything */
  all: DialogControls
  /** The dialog of the file fixes */
  files: FixFilesState
  /** The dialog of the git fixes */
  git: ActionDialog<GitFixPreview>
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The dialogs of the fixes: the file fixes, the git fixes, and both at once. While the dialog of both is open the two others stay closed, it shows their plans itself
 * @param props the props
 * @param props.all the controls of the dialog that fixes everything
 * @param props.files the dialog of the file fixes
 * @param props.git the dialog of the git fixes
 * @param props.slug the `owner/name` of the repo
 * @returns the dialogs
 */
export function FixDialogs({ all, files, git, slug }: Readonly<FixDialogsProps>) {
  return (
    <>
      <FixFilesDialog dialog={{ ...files, isOpen: files.isOpen && !all.isOpen }} slug={slug} />
      <FixGitDialog dialog={{ ...git, isOpen: git.isOpen && !all.isOpen }} slug={slug} />
      <FixAllDialog dialog={all} files={files} git={git} slug={slug} />
    </>
  )
}
