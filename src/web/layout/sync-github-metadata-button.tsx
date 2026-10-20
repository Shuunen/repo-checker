import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { ActionTrigger } from './action-trigger.tsx'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { SyncGithubMetadataBody } from './sync-github-metadata-body.tsx'
import { useSyncGithubMetadata } from './use-sync-github-metadata.ts'

/**
 * The Sync infos action: the button opens a dialog that shows what the project and GitHub have now and the proposed description and homepage (the deployed website), in inputs the user can edit. What is confirmed is written on GitHub and in the project, and Sync is only possible when a value differs from what one of them has. The scan runs again after it worked
 * @param props the props
 * @param props.project the project whose infos are synced
 * @returns the button and its dialog
 */
export function SyncGithubMetadataButton({ project }: Readonly<{ project: Project }>) {
  const sync = useSyncGithubMetadata(project.name)
  const { preview, values } = sync
  const isChanged = preview?.ok === true && [preview.github, preview.local].some(current => values.description.trim() !== current.description || values.homepage.trim() !== current.homepage)
  return (
    <>
      <ActionTrigger onPress={sync.handleOpen} testId="action-sync-github-metadata">
        Sync infos
      </ActionTrigger>
      <ConfirmDialog confirmLabel="Sync" dialog={sync} heading={`Sync the infos of ${slugOf(project)}?`} isBlocked={!isChanged} isWide prefix="sync-github-metadata">
        <SyncGithubMetadataBody dialog={sync} onChange={sync.handleChange} values={values} />
      </ConfirmDialog>
    </>
  )
}
