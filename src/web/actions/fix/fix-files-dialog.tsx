import { ConfirmDialog } from '../confirm-dialog.tsx'
import { CommitToggle } from './commit-toggle.tsx'
import { FixFilesBody } from './fix-files-body.tsx'
import type { FixFilesDialog as FixFilesState } from './use-fix-files.ts'

/** What `FixFilesDialog` shows and does */
interface FixFilesDialogProps {
  /** The dialog of the file fixes */
  dialog: FixFilesState
  /** The id of the rule when only its findings are fixed */
  rule?: string
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The confirmation before the file fixes: a diff per file, read fresh, and the auto commit toggle. Nothing is written until Apply is pressed
 * @param props the props
 * @returns the dialog
 */
export function FixFilesDialog({ dialog, rule, slug }: Readonly<FixFilesDialogProps>) {
  return (
    <ConfirmDialog
      confirmLabel="Apply the fixes"
      dialog={dialog}
      footerStart={dialog.stage === undefined ? <CommitToggle isCommit={dialog.isCommit} onChange={dialog.handleCommitChange} /> : undefined}
      heading={rule === undefined ? `Fix the files of ${slug}?` : `Fix ${rule} on ${slug}?`}
      isWide
      prefix="fix"
    >
      <FixFilesBody dialog={dialog} />
    </ConfirmDialog>
  )
}
