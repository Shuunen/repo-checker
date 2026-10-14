import { Button } from '@heroui/react'
import type { ProjectDeletePreview } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { DeleteProjectDialog } from './delete-project-dialog.tsx'
import { usePreviewedDialog } from './use-previewed-dialog.ts'

/**
 * The trash icon of a project row: it opens a confirmation that says what is deleted for good, the repo on GitHub and the local clone, and the delete only runs when it is confirmed. The scan runs again after it worked
 * @param props the props
 * @param props.isLabelled true for a button with the words Delete project, as on the project page, instead of the icon of a row
 * @param props.project the project to delete
 * @returns the icon button and its dialog
 */
export function DeleteProjectButton({ isLabelled = false, project }: Readonly<{ isLabelled?: boolean; project: Project }>) {
  const dialog = usePreviewedDialog<ProjectDeletePreview>(project.name, 'delete-project')
  return (
    <>
      <Button aria-label={`Delete ${project.name}`} data-testid="action-delete-project" isIconOnly={!isLabelled} onPress={dialog.handleOpen} size="sm" variant={isLabelled ? 'danger-soft' : 'ghost'}>
        <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
        </svg>
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
