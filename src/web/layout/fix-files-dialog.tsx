import { CommitToggle } from './commit-toggle.tsx'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { FixFilesBody } from './fix-files-body.tsx'
import type { FixFilesDialog as FixFilesState } from './use-fix-files.ts'

/** What `FixFilesDialog` shows and does */
interface FixFilesDialogProps {
  /** The dialog of the file fixes */
  dialog: FixFilesState
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The confirmation before the file fixes: a diff per file, read fresh, and the auto commit toggle. Nothing is written until Apply is pressed
 * @param props the props
 * @returns the dialog
 */
export function FixFilesDialog({ dialog, slug }: Readonly<FixFilesDialogProps>) {
  return (
    <ConfirmDialog confirmLabel="Apply the fixes" dialog={dialog} footerStart={dialog.stage === undefined ? <CommitToggle isCommit={dialog.isCommit} onChange={dialog.handleCommitChange} /> : undefined} heading={`Fix the files of ${slug}?`} isWide prefix="fix">
      <FixFilesBody dialog={dialog} />
    </ConfirmDialog>
  )
}
