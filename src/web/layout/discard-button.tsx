import { Button } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { DiscardDialog } from './discard-dialog.tsx'
import { useDiscardDialog } from './use-discard-dialog.ts'

/**
 * The Discard action: the button opens a confirmation that first reads, fresh, exactly what would be thrown away, and the discard only runs when it is confirmed, and only if the clone still holds exactly that. The scan runs again after it worked
 * @param props the props
 * @param props.project the project whose unsaved work is discarded
 * @returns the button and its dialog
 */
export function DiscardButton({ project }: Readonly<{ project: Project }>) {
  const dialog = useDiscardDialog(project.name)
  return (
    <>
      <Button data-testid="action-discard" onPress={dialog.handleOpen} size="sm" variant="outline">
        Discard
      </Button>
      <DiscardDialog
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
