import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { ActionTrigger } from './action-trigger.tsx'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { useActionDialog } from './use-action-dialog.ts'

/**
 * The Clone action: the button opens a confirmation, the clone only runs when it is confirmed. The scan runs again after it worked
 * @param props the props
 * @param props.project the project to clone
 * @param props.target the folder of projects the clone goes in
 * @returns the button and its dialog
 */
export function CloneButton({ project, target }: Readonly<{ project: Project; target: string }>) {
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
