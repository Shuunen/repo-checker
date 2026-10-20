import type { GitFixPreview } from '../../shared/action.ts'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { FixGitBody } from './fix-git-body.tsx'
import type { ActionDialog } from './use-action-dialog.ts'

/**
 * The confirmation before the git fixes: what they would do, read fresh. Nothing changes until Fix is pressed
 * @param props the props
 * @param props.dialog the dialog of the git fixes
 * @param props.slug the `owner/name` of the repo
 * @returns the dialog
 */
export function FixGitDialog({ dialog, slug }: Readonly<{ dialog: ActionDialog<GitFixPreview>; slug: string }>) {
  return (
    <ConfirmDialog confirmLabel="Fix the git issues" dialog={dialog} heading={`Fix the git issues of ${slug}?`} prefix="fix-git">
      <FixGitBody dialog={dialog} />
    </ConfirmDialog>
  )
}
