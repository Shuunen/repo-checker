import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { ActionTrigger } from './action-trigger.tsx'
import { UpdateProjectDialog } from './update-project-dialog.tsx'
import { useUpdateChat } from './use-update-chat.ts'

/** What `UpdateProjectButton` shows and does */
interface UpdateProjectButtonProps {
  /** The project to update */
  project: Project
}

/**
 * The Update project action: the button opens a modal where Claude runs the `/update-project` skill in the clone and you answer its questions. The session lasts until the Close session button is pressed, then the project is scanned again
 * @param props the props
 * @returns the button and its dialog
 */
export function UpdateProjectButton({ project }: Readonly<UpdateProjectButtonProps>) {
  const chat = useUpdateChat(project.name)
  return (
    <>
      <ActionTrigger onPress={() => void chat.handleOpen()} testId="action-update-project">
        Update project
      </ActionTrigger>
      <UpdateProjectDialog chat={chat} slug={slugOf(project)} />
    </>
  )
}
