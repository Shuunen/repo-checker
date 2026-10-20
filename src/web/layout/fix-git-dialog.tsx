import type { GitFixPreview } from '../../shared/action.ts'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { FixGitBody } from './fix-git-body.tsx'
import type { ActionDialog } from './use-action-dialog.ts'

/** What `FixGitDialog` shows and does */
interface FixGitDialogProps {
  /** The dialog of the git fixes */
  dialog: ActionDialog<GitFixPreview>
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The confirmation before the git fixes: what they would do, read fresh. Nothing changes until Fix is pressed
 * @param props the props
 * @returns the dialog
 */
export function FixGitDialog({ dialog, slug }: Readonly<FixGitDialogProps>) {
  return (
    <ConfirmDialog confirmLabel="Fix the git issues" dialog={dialog} heading={`Fix the git issues of ${slug}?`} prefix="fix-git">
      <FixGitBody dialog={dialog} />
    </ConfirmDialog>
  )
}
