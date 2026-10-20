import { invariant } from 'es-toolkit'
import type { Project } from '../../shared/project.ts'
import { unsavedGroups } from '../../shared/unsaved.ts'
import { slugOf, unarchiveBlocker } from '../projects/detail.ts'
import { ActionTrigger } from './action-trigger.tsx'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { UnsavedList } from './unsaved-list.tsx'
import { useActionDialog } from './use-action-dialog.ts'

/**
 * The Unarchive and push action of an archived repo whose clone holds unsaved work: the button opens a confirmation that says what happens in which order and lists that work, and nothing runs until it is confirmed. The scan runs again after it worked
 * @param props the props
 * @param props.project the project, it has a clone
 * @returns the button and its dialog
 */
export function UnarchivePushButton({ project }: Readonly<{ project: Project }>) {
  const dialog = useActionDialog(project.name, 'unarchive-push')
  invariant(project.local !== undefined, 'the action is only offered for a clone')
  const blocker = unarchiveBlocker(project.local)
  const slug = slugOf(project)
  return (
    <>
      <ActionTrigger onPress={dialog.handleOpen} testId="action-unarchive-push">
        Unarchive & push
      </ActionTrigger>
      <ConfirmDialog confirmLabel="Unarchive, push, archive again" dialog={dialog} heading={`Save the unsaved work of ${slug}?`} isBlocked={blocker !== undefined} prefix="unarchive">
        <p>{`GitHub rejects a push to an archived repo, so ${slug} is unarchived, these branches are pushed without creating any commit, then it is archived again, even if the push fails. It is writable for a few seconds.`}</p>
        <UnsavedList groups={unsavedGroups(project.local)} />
        {blocker !== undefined && <p data-testid="unarchive-blocker">{blocker}</p>}
        {dialog.error !== undefined && <p data-testid="unarchive-error">{dialog.error}</p>}
      </ConfirmDialog>
    </>
  )
}
