import type { DeleteBranchesPreview } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { plural } from '../../shared/text.ts'
import { slugOf } from '../projects/detail.ts'
import { ActionTrigger } from './action-trigger.tsx'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { GitList } from './git-list.tsx'
import { PreviewBody } from './preview-body.tsx'
import { useActionDialog } from './use-action-dialog.ts'

/** What `DeleteBranchesButton` shows and does */
interface DeleteBranchesButtonProps {
  /** The project whose local branches are deleted */
  project: Project
}

/**
 * The Delete local branches action: the button opens a confirmation that lists, read fresh, the local branches but the default one and the checked out one, and the delete only runs when it is confirmed, and only if the list is still the same. The scan runs again after it worked
 * @param props the props
 * @returns the button and its dialog
 */
export function DeleteBranchesButton({ project }: Readonly<DeleteBranchesButtonProps>) {
  const dialog = useActionDialog<DeleteBranchesPreview>(project.name, 'delete-branches')
  return (
    <>
      <ActionTrigger onPress={dialog.handleOpen} testId="action-delete-branches">
        Delete local branches
      </ActionTrigger>
      <ConfirmDialog confirmLabel="Delete branches" dialog={dialog} heading={`Delete the local branches of ${slugOf(project)}?`} isDanger prefix="delete-branches">
        <PreviewBody checking="Listing the local branches on the clone as it is now…" className="flex flex-col gap-3" dialog={dialog} prefix="delete-branches">
          {({ branches }) => <GitList items={branches} testId="delete-branches-list" title={`Delete ${plural(branches.length, 'local branch')}, even the ones with work that is not on GitHub:`} />}
        </PreviewBody>
      </ConfirmDialog>
    </>
  )
}
