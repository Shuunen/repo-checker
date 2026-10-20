import { Button } from '@heroui/react'
import type { DeleteBranchesPreview } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { DeleteBranchesDialog } from './delete-branches-dialog.tsx'
import { usePreviewedDialog } from './use-previewed-dialog.ts'

/**
 * The Delete local branches action: the button opens a confirmation that first asks the server to list the branches again, and the delete only runs when it is confirmed. The scan runs again after it worked
 * @param props the props
 * @param props.project the project whose local branches are deleted
 * @returns the button and its dialog
 */
export function DeleteBranchesButton({ project }: Readonly<{ project: Project }>) {
  const dialog = usePreviewedDialog<DeleteBranchesPreview>(project.name, 'delete-branches', { fingerprintOf: preview => preview.fingerprint })
  return (
    <>
      <Button data-testid="action-delete-branches" onPress={dialog.handleOpen} size="sm" variant="outline">
        Delete local branches
      </Button>
      <DeleteBranchesDialog
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
