import type { GitFixPreview } from '../../shared/action.ts'
import { CommitToggle } from './commit-toggle.tsx'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { FixFilesBody } from './fix-files-body.tsx'
import { FixGitBody } from './fix-git-body.tsx'
import type { ActionDialog, DialogControls } from './use-action-dialog.ts'
import type { FixFilesDialog } from './use-fix-files.ts'

/** What the dialog that fixes everything shows and does */
interface FixAllDialogProps {
  /** The controls of the dialog */
  dialog: DialogControls
  /** The dialog of the file fixes */
  files: FixFilesDialog
  /** The dialog of the git fixes */
  git: ActionDialog<GitFixPreview>
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The confirmation before fixing everything: the plan of the git fixes, then the plan of the file fixes, with the auto commit toggle. Nothing changes until Fix all is pressed
 * @param props the props
 * @param props.dialog the controls of the dialog
 * @param props.files the dialog of the file fixes
 * @param props.git the dialog of the git fixes
 * @param props.slug the `owner/name` of the repo
 * @returns the dialog
 */
export function FixAllDialog({ dialog, files, git, slug }: Readonly<FixAllDialogProps>) {
  return (
    <ConfirmDialog confirmLabel="Fix all issues" dialog={dialog} footerStart={files.stage === undefined ? <CommitToggle isCommit={files.isCommit} onChange={files.handleCommitChange} /> : undefined} heading={`Fix all the issues of ${slug}?`} isWide prefix="fix-all">
      <div className="flex flex-col gap-4">
        <FixGitBody dialog={git} />
        <FixFilesBody dialog={files} />
      </div>
    </ConfirmDialog>
  )
}
