import type { ForkDeletePreview } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { plural } from '../../shared/text.ts'
import { slugOf } from '../projects/detail.ts'
import { ActionTrigger } from './action-trigger.tsx'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { IgnoredFiles } from './ignored-files.tsx'
import { PreviewBody } from './preview-body.tsx'
import { useActionDialog } from './use-action-dialog.ts'

/**
 * The Delete fork action: the button opens a confirmation that first asks the server to prove again, from GitHub, that the fork is pristine and that the token may delete, and the delete only runs when it is confirmed. The scan runs again after it worked
 * @param props the props
 * @param props.project the fork
 * @returns the button and its dialog
 */
export function DeleteForkButton({ project }: Readonly<{ project: Project }>) {
  const dialog = useActionDialog<ForkDeletePreview>(project.name, 'delete-fork')
  const slug = slugOf(project)
  return (
    <>
      <ActionTrigger onPress={dialog.handleOpen} testId="action-delete-fork">
        Delete fork
      </ActionTrigger>
      <ConfirmDialog confirmLabel="Delete the fork" dialog={dialog} heading={`Delete the fork ${slug}?`} isDanger prefix="fork">
        <PreviewBody checking="Checking again, comparing every branch with the parent, the open pull requests and your gh token…" dialog={dialog} prefix="fork">
          {({ branches, clone, parent }) => (
            <>
              <p>{`This deletes the fork ${slug} on GitHub for good, it cannot be undone. ${plural(branches, 'branch')} compared with ${parent}: none has a commit that ${parent} does not have, and no pull request is open.`}</p>
              {clone !== undefined && <p data-testid="fork-clone">{`Its clean local clone ${clone.path} is deleted too, with the files git ignores in it:`}</p>}
              {clone !== undefined && <IgnoredFiles files={clone.ignoredFiles} />}
            </>
          )}
        </PreviewBody>
      </ConfirmDialog>
    </>
  )
}
