import type { DiscardPreview } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { ActionTrigger } from './action-trigger.tsx'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { PreviewBody } from './preview-body.tsx'
import { UnsavedList } from './unsaved-list.tsx'
import { useActionDialog } from './use-action-dialog.ts'

/** What `DiscardButton` shows and does */
interface DiscardButtonProps {
  /** The project whose unsaved work is discarded */
  project: Project
}

/**
 * The Discard action: the button opens a confirmation that first reads, fresh, exactly what would be thrown away, and the discard only runs when it is confirmed, and only if the clone still holds exactly that. The scan runs again after it worked
 * @param props the props
 * @returns the button and its dialog
 */
export function DiscardButton({ project }: Readonly<DiscardButtonProps>) {
  const dialog = useActionDialog<DiscardPreview>(project.name, 'discard')
  return (
    <>
      <ActionTrigger onPress={dialog.handleOpen} testId="action-discard">
        Discard
      </ActionTrigger>
      <ConfirmDialog confirmLabel="Discard everything listed" dialog={dialog} heading={`Discard the unsaved work of ${slugOf(project)}?`} isDanger prefix="discard">
        <PreviewBody checking="Reading again, with a fresh git fetch, exactly what would be thrown away…" dialog={dialog} prefix="discard">
          {preview => (
            <>
              <p>{`The clone ${preview.path} goes back to exactly what GitHub has. All of this is thrown away for good, there is no undo. The files git ignores stay.`}</p>
              <UnsavedList groups={preview.groups} />
            </>
          )}
        </PreviewBody>
      </ConfirmDialog>
    </>
  )
}
