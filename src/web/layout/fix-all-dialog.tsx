import { CommitToggle } from './commit-toggle.tsx'
import { ConfirmDialog } from './confirm-dialog.tsx'
import type { FixFilesDialogState } from './fix-files-dialog.tsx'
import { FixFilesBody } from './fix-files-body.tsx'
import type { FixGitDialogState } from './fix-git-dialog.tsx'
import { FixGitBody } from './fix-git-body.tsx'

/** What the dialog is given */
interface FixAllDialogProps {
  /** The state of the file fixes */
  files: FixFilesDialogState
  /** The state of the git fixes */
  git: FixGitDialogState
  /** True when the dialog is shown */
  isOpen: boolean
  /** Close the dialog without changing anything */
  onCancel: () => void
  /** Run the git fixes then the file fixes */
  onConfirm: () => void
  /** Called with the new state when the dialog opens or closes */
  onOpenChange: (isOpen: boolean) => void
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The confirmation before every fix: what the git fixes would do, then the diff of the file fixes. The git issues are fixed first, so the files are written on a clone that is up to date
 * @param props the props
 * @param props.files the state of the file fixes
 * @param props.git the state of the git fixes
 * @param props.isOpen true when the dialog is shown
 * @param props.onCancel closes the dialog
 * @param props.onConfirm runs the fixes
 * @param props.onOpenChange called when the dialog opens or closes
 * @param props.slug the `owner/name` of the repo
 * @returns the dialog
 */
export function FixAllDialog({ files, git, isOpen, onCancel, onConfirm, onOpenChange, slug }: Readonly<FixAllDialogProps>) {
  const { onCommitChange } = files
  const isLoading = files.isLoading || git.isLoading
  const canConfirm = (files.preview?.ok === true || git.preview?.ok === true) && !isLoading
  return (
    <ConfirmDialog
      canConfirm={canConfirm}
      confirmLabel="Fix all issues"
      footerStart={files.stage === undefined ? <CommitToggle isCommit={files.isCommit} onChange={onCommitChange} /> : undefined}
      heading={`Fix all the issues of ${slug}?`}
      isDanger={false}
      isOpen={isOpen}
      isPending={files.isPending || git.isPending}
      isWide
      onCancel={onCancel}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      prefix="fix-all"
    >
      <div className="flex flex-col gap-4">
        <FixGitBody error={git.error} isLoading={git.isLoading} preview={git.preview} previewError={git.previewError} />
        <FixFilesBody error={files.error} isLoading={files.isLoading} preview={files.preview} previewError={files.previewError} stage={files.stage} />
      </div>
    </ConfirmDialog>
  )
}
