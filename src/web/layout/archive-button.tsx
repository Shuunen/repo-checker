import { Button } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { ArchiveDialog } from './archive-dialog.tsx'
import { useActionDialog } from './use-action-dialog.ts'

/**
 * The Archive or Unarchive action of a project on GitHub: the button opens a confirmation, the change only runs when it is confirmed. The scan runs again after it worked
 * @param props the props
 * @param props.action archive a project that is not archived, unarchive one that is
 * @param props.project the project
 * @returns the button and its dialog
 */
export function ArchiveButton({ action, project }: Readonly<{ action: 'archive' | 'unarchive'; project: Project }>) {
  const dialog = useActionDialog(project.name, action)
  return (
    <>
      <Button data-testid={`action-${action}`} onPress={dialog.handleOpen} size="sm" variant="outline">
        {action === 'archive' ? 'Archive on GitHub' : 'Unarchive on GitHub'}
      </Button>
      <ArchiveDialog action={action} error={dialog.error} isOpen={dialog.isOpen} isPending={dialog.isPending} onCancel={dialog.handleClose} onConfirm={dialog.handleConfirm} onOpenChange={dialog.handleOpenChange} slug={slugOf(project)} />
    </>
  )
}
