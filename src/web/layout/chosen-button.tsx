import type { ActionKind, ProjectAction } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { ActionButton } from './action-button.tsx'
import { ArchiveButton } from './archive-button.tsx'
import { DeleteProjectButton } from './delete-project-button.tsx'
import { UpdateProjectButton } from './update-project-button.tsx'

/**
 * The button of the action chosen in the menu, mounted only once its item is chosen
 * @param props the props
 * @param props.actions the actions the project offers
 * @param props.chosen the action chosen, undefined before
 * @param props.project the project
 * @param props.target the folder of projects, where a clone goes
 * @returns the button, nothing before a choice
 */
export function ChosenButton({ actions, chosen, project, target }: Readonly<{ actions: readonly ActionKind[]; chosen: ProjectAction | undefined; project: Project; target: string }>) {
  if (chosen === 'archive' || chosen === 'unarchive') return <ArchiveButton action={chosen} project={project} />
  if (chosen === 'delete-project') return <DeleteProjectButton project={project} />
  if (chosen === 'update-project') return <UpdateProjectButton project={project} />
  return chosen !== undefined && actions.includes(chosen) ? <ActionButton action={chosen} project={project} target={target} /> : undefined
}
