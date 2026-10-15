import { Button } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { SyncGithubMetadataDialog } from './sync-github-metadata-dialog.tsx'
import { useActionDialog } from './use-action-dialog.ts'

/**
 * The Copy to GitHub action: the button opens a confirmation, the description and the homepage of package.json are only sent to GitHub when it is confirmed. The scan runs again after it worked
 * @param props the props
 * @param props.project the project whose repo on GitHub is changed
 * @returns the button and its dialog
 */
export function SyncGithubMetadataButton({ project }: Readonly<{ project: Project }>) {
  const dialog = useActionDialog(project.name, 'sync-github-metadata')
  return (
    <>
      <Button data-testid="action-sync-github-metadata" onPress={dialog.handleOpen} size="sm" variant="outline">
        Copy the description and homepage to GitHub
      </Button>
      <SyncGithubMetadataDialog error={dialog.error} isOpen={dialog.isOpen} isPending={dialog.isPending} onCancel={dialog.handleClose} onConfirm={dialog.handleConfirm} onOpenChange={dialog.handleOpenChange} slug={slugOf(project)} />
    </>
  )
}
