import { Button } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { DeleteCloneDialog } from './delete-clone-dialog.tsx'
import { useDeleteCloneDialog } from './use-delete-clone-dialog.ts'

/**
 * The Delete clone action: the button opens a confirmation that first asks the server to prove again that nothing would be lost, and the delete only runs when it is confirmed. The scan runs again after it worked
 * @param props the props
 * @param props.project the project whose clone is deleted
 * @returns the button and its dialog
 */
export function DeleteCloneButton({ project }: Readonly<{ project: Project }>) {
  const dialog = useDeleteCloneDialog(project.name)
  return (
    <>
      <Button data-testid="action-delete-clone" onPress={dialog.handleOpen} size="sm" variant="outline">
        Delete clone
      </Button>
      <DeleteCloneDialog
        error={dialog.error}
        isLoading={dialog.isLoading}
        isOpen={dialog.isOpen}
        isPending={dialog.isPending}
        onCancel={dialog.handleClose}
        onConfirm={dialog.handleConfirm}
        onOpenChange={dialog.handleOpenChange}
        preview={dialog.preview}
        previewError={dialog.previewError}
        slug={slugOf(project)}
      />
    </>
  )
}
