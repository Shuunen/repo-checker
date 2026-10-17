import { Button } from '@heroui/react'
import type { ForkDeletePreview } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { DeleteForkDialog } from './delete-fork-dialog.tsx'
import { usePreviewedDialog } from './use-previewed-dialog.ts'

/**
 * The Delete fork action: the button opens a confirmation that first asks the server to prove again, from GitHub, that the fork is pristine and that the token may delete, and the delete only runs when it is confirmed. The scan runs again after it worked
 * @param props the props
 * @param props.project the fork
 * @returns the button and its dialog
 */
export function DeleteForkButton({ project }: Readonly<{ project: Project }>) {
  const dialog = usePreviewedDialog<ForkDeletePreview>(project.name, 'delete-fork')
  return (
    <>
      <Button data-testid="action-delete-fork" onPress={dialog.handleOpen} size="sm" variant="outline">
        Delete fork
      </Button>
      <DeleteForkDialog
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
