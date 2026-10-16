import { Trash2 } from 'lucide-react'
import { Button } from '@heroui/react'
import { useLocation } from 'wouter'
import type { ProjectDeletePreview } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { DeleteProjectDialog } from './delete-project-dialog.tsx'
import { usePreviewedDialog } from './use-previewed-dialog.ts'

/**
 * The trash icon of a project row: it opens a confirmation that says what is deleted for good, the repo on GitHub and the local clone, and the delete only runs when it is confirmed. Once it worked the page goes back to the list. The scan runs again after it worked
 * @param props the props
 * @param props.isLabelled true for a button with the words Delete project, as on the project page, instead of the icon of a row
 * @param props.project the project to delete
 * @returns the icon button and its dialog
 */
export function DeleteProjectButton({ isLabelled = false, project }: Readonly<{ isLabelled?: boolean; project: Project }>) {
  const [, navigate] = useLocation()
  const dialog = usePreviewedDialog<ProjectDeletePreview>(project.name, 'delete-project', { onDone: () => navigate('/') })
  return (
    <>
      <Button aria-label={`Delete ${project.name}`} data-testid="action-delete-project" isIconOnly={!isLabelled} onPress={dialog.handleOpen} size="sm" variant={isLabelled ? 'danger-soft' : 'ghost'}>
        <Trash2 aria-hidden="true" size={16} />
        {isLabelled && 'Delete project'}
      </Button>
      <DeleteProjectDialog
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
