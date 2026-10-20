import { CommitToggle } from './commit-toggle.tsx'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { FixFilesBody } from './fix-files-body.tsx'
import type { FixFilesDialog as FixFilesState } from './use-fix-files.ts'

/**
 * The confirmation before the file fixes: a diff per file, read fresh, and the auto commit toggle. Nothing is written until Apply is pressed
 * @param props the props
 * @param props.dialog the dialog of the file fixes
 * @param props.slug the `owner/name` of the repo
 * @returns the dialog
 */
export function FixFilesDialog({ dialog, slug }: Readonly<{ dialog: FixFilesState; slug: string }>) {
  return (
    <ConfirmDialog confirmLabel="Apply the fixes" dialog={dialog} footerStart={dialog.stage === undefined ? <CommitToggle isCommit={dialog.isCommit} onChange={dialog.handleCommitChange} /> : undefined} heading={`Fix the files of ${slug}?`} isWide prefix="fix">
      <FixFilesBody dialog={dialog} />
    </ConfirmDialog>
  )
}
