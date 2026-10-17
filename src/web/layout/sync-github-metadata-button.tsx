import { Button } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { SyncGithubMetadataDialog } from './sync-github-metadata-dialog.tsx'
import { useSyncGithubMetadata } from './use-sync-github-metadata.ts'

/**
 * The Sync infos action: the button opens a dialog that shows what the project and GitHub have now and the proposed description and homepage (the deployed website), in inputs the user can edit. What is confirmed is written on GitHub and in the project. The scan runs again after it worked
 * @param props the props
 * @param props.project the project whose repo on GitHub is changed
 * @returns the button and its dialog
 */
export function SyncGithubMetadataButton({ project }: Readonly<{ project: Project }>) {
  const sync = useSyncGithubMetadata(project.name)
  return (
    <>
      <Button data-testid="action-sync-github-metadata" onPress={sync.handleOpen} size="sm" variant="outline">
        Sync infos
      </Button>
      <SyncGithubMetadataDialog
        error={sync.error}
        isLoading={sync.isLoading}
        isOpen={sync.isOpen}
        isPending={sync.isPending}
        onCancel={sync.handleClose}
        onChange={sync.handleChange}
        onConfirm={sync.handleConfirm}
        onOpenChange={sync.handleOpenChange}
        preview={sync.preview}
        previewError={sync.previewError}
        slug={slugOf(project)}
        values={sync.values}
      />
    </>
  )
}
