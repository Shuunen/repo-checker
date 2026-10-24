import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { ActionTrigger } from './action-trigger.tsx'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { useActionDialog } from './use-action-dialog.ts'

/** What `ArchiveButton` shows and does */
interface ArchiveButtonProps {
  /** Archive or unarchive */
  action: 'archive' | 'unarchive'
  /** The project whose repo is archived or unarchived */
  project: Project
}

/**
 * The Archive or Unarchive action: the button opens a confirmation, the action only runs when it is confirmed. The scan runs again after it worked
 * @param props the props
 * @returns the button and its dialog
 */
export function ArchiveButton({ action, project }: Readonly<ArchiveButtonProps>) {
  const dialog = useActionDialog(project.name, action)
  const isArchiving = action === 'archive'
  const slug = slugOf(project)
  return (
    <>
      <ActionTrigger onPress={dialog.handleOpen} testId={`action-${action}`}>
        {isArchiving ? 'Archive on GitHub' : 'Unarchive on GitHub'}
      </ActionTrigger>
      <ConfirmDialog confirmLabel={isArchiving ? 'Archive' : 'Unarchive'} dialog={dialog} heading={`${isArchiving ? 'Archive' : 'Unarchive'} ${slug}?`} prefix={action}>
        {isArchiving ? `${slug} becomes read-only on GitHub. Nothing is deleted, and it can be unarchived.` : `${slug} becomes writable again on GitHub, it is not archived any more.`}
        {dialog.error !== undefined && <p data-testid={`${action}-error`}>{dialog.error}</p>}
      </ConfirmDialog>
    </>
  )
}
