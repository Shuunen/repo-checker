import { Button } from '@heroui/react'
import { invariant } from 'es-toolkit'
import type { Project } from '../../shared/project.ts'
import { slugOf, unarchiveBlocker } from '../projects/detail.ts'
import { UnarchivePushDialog } from './unarchive-push-dialog.tsx'
import { useActionDialog } from './use-action-dialog.ts'

/**
 * The Unarchive and push action of an archived repo whose clone holds unsaved work: the button opens a confirmation that lists that work, and nothing runs until it is confirmed. The scan runs again after it worked
 * @param props the props
 * @param props.project the project, it has a clone
 * @returns the button and its dialog
 */
export function UnarchivePushButton({ project }: Readonly<{ project: Project }>) {
  const dialog = useActionDialog(project.name, 'unarchive-push')
  invariant(project.local !== undefined, 'the action is only offered for a clone')
  return (
    <>
      <Button data-testid="action-unarchive-push-rearchive" onPress={dialog.handleOpen} size="sm" variant="outline">
        Unarchive & push
      </Button>
      <UnarchivePushDialog blocker={unarchiveBlocker(project.local)} error={dialog.error} isOpen={dialog.isOpen} isPending={dialog.isPending} local={project.local} onCancel={dialog.handleClose} onConfirm={dialog.handleConfirm} onOpenChange={dialog.handleOpenChange} slug={slugOf(project)} />
    </>
  )
}
