import { Button } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { UpdateProjectDialog } from './update-project-dialog.tsx'
import { useUpdateChat } from './use-update-chat.ts'

/**
 * The Update project action: the button opens a modal where Claude runs the `/update-project` skill in the clone and you answer its questions. The session lasts until the Close session button is pressed, then the project is scanned again
 * @param props the props
 * @param props.project the project to update
 * @returns the button and its dialog
 */
export function UpdateProjectButton({ project }: Readonly<{ project: Project }>) {
  const chat = useUpdateChat(project.name)
  return (
    <>
      <Button data-testid="action-update-project" onPress={() => void chat.handleOpen()} size="sm" variant="outline">
        Update project
      </Button>
      <UpdateProjectDialog chat={chat} slug={slugOf(project)} />
    </>
  )
}
