import type { DeletePreview } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { ActionTrigger } from './action-trigger.tsx'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { IgnoredFiles } from './ignored-files.tsx'
import { PreviewBody } from './preview-body.tsx'
import { useActionDialog } from './use-action-dialog.ts'

/**
 * The Delete clone action: the button opens a confirmation that first asks the server to prove again, with a fresh git fetch, that nothing would be lost, and lists the ignored files that would be. The delete only runs when it is confirmed. The scan runs again after it worked
 * @param props the props
 * @param props.project the project whose clone is deleted
 * @returns the button and its dialog
 */
export function DeleteCloneButton({ project }: Readonly<{ project: Project }>) {
  const dialog = useActionDialog<DeletePreview>(project.name, 'delete-clone')
  return (
    <>
      <ActionTrigger onPress={dialog.handleOpen} testId="action-delete-clone">
        Delete clone
      </ActionTrigger>
      <ConfirmDialog confirmLabel="Delete clone" dialog={dialog} heading={`Delete the local clone of ${slugOf(project)}?`} isDanger prefix="delete">
        <PreviewBody checking="Checking again, with a fresh git fetch, that nothing would be lost…" dialog={dialog} prefix="delete">
          {preview => (
            <>
              <p>{`This deletes the folder ${preview.path} for good. Everything in it is on GitHub, except the files git ignores:`}</p>
              <IgnoredFiles files={preview.ignoredFiles} />
            </>
          )}
        </PreviewBody>
      </ConfirmDialog>
    </>
  )
}
