import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { ActionTrigger } from './action-trigger.tsx'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { useActionDialog } from './use-action-dialog.ts'

/** What `CloneButton` shows and does */
interface CloneButtonProps {
  /** The project to clone */
  project: Project
  /** The folder of projects the clone goes in */
  target: string
}

/**
 * The Clone action: the button opens a confirmation, the clone only runs when it is confirmed. The scan runs again after it worked
 * @param props the props
 * @returns the button and its dialog
 */
export function CloneButton({ project, target }: Readonly<CloneButtonProps>) {
  const dialog = useActionDialog(project.name, 'clone')
  const slug = slugOf(project)
  return (
    <>
      <ActionTrigger onPress={dialog.handleOpen} testId="action-clone">
        Clone
      </ActionTrigger>
      <ConfirmDialog confirmLabel="Clone" dialog={dialog} heading={`Clone ${slug}?`} prefix="clone">
        {`${slug} is cloned over SSH into ${target}/${project.name}. Nothing that already exists is changed, and the clone is refused if a folder of that name appears before.`}
        {dialog.error !== undefined && <p data-testid="clone-error">{dialog.error}</p>}
      </ConfirmDialog>
    </>
  )
}
