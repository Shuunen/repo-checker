import { Button } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { CloneDialog } from './clone-dialog.tsx'
import { useCloneDialog } from './use-clone-dialog.ts'

/**
 * The Clone action: the button opens a confirmation, the clone only runs when it is confirmed. The scan runs again after it worked
 * @param props the props
 * @param props.project the project to clone
 * @param props.target the folder of projects, where the clone goes
 * @returns the button and its dialog
 */
export function CloneButton({ project, target }: Readonly<{ project: Project; target: string }>) {
  const dialog = useCloneDialog(project.name)
  return (
    <>
      <Button data-testid="action-clone" onPress={dialog.handleOpen} size="sm" variant="outline">
        Clone
      </Button>
      <CloneDialog error={dialog.error} folder={`${target}/${project.name}`} isOpen={dialog.isOpen} isPending={dialog.isPending} onCancel={dialog.handleClose} onConfirm={dialog.handleConfirm} onOpenChange={dialog.handleOpenChange} slug={slugOf(project)} />
    </>
  )
}
