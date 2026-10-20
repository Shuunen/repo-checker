import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { ActionTrigger } from './action-trigger.tsx'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { useActionDialog } from './use-action-dialog.ts'

/**
 * The Archive or Unarchive action: the button opens a confirmation, the action only runs when it is confirmed. The scan runs again after it worked
 * @param props the props
 * @param props.action archive or unarchive
 * @param props.project the project whose repo is archived or unarchived
 * @returns the button and its dialog
 */
export function ArchiveButton({ action, project }: Readonly<{ action: 'archive' | 'unarchive'; project: Project }>) {
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
