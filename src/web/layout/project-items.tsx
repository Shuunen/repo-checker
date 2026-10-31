import { ArrowRight, ExternalLink } from 'lucide-react'
import type { ActionKind } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { canDeleteBranches, canUpdate } from '../projects/can-update.ts'
import { ActionItem } from './action-item.tsx'
import { ArchiveItem } from './archive-item.tsx'
import { LinkItem } from './link-item.tsx'

/** What `ProjectItems` shows and does */
interface ProjectItemsProps {
  /** The actions the project offers */
  actions: readonly ActionKind[]
  /** True when a major dependency is outdated */
  isMajorOutdated: boolean
  /** The project */
  project: Project
}

/**
 * The first items of the menu: Open project, Open on GitHub, one item per action, Delete local branches, Update project and Archive on GitHub or Unarchive on GitHub
 * @param props the props
 * @returns the items
 */
export function ProjectItems({ actions, isMajorOutdated, project }: Readonly<ProjectItemsProps>) {
  return (
    <>
      <LinkItem icon={ArrowRight} id="open-project" label="Open project" />
      {project.github !== undefined && <LinkItem icon={ExternalLink} id="open-github" label="Open on GitHub" />}
      {actions.map(action => (
        <ActionItem action={action} key={action} project={project} />
      ))}
      {canDeleteBranches(project) && <ActionItem action="delete-branches" project={project} />}
      {canUpdate(project, isMajorOutdated) && <ActionItem action="update-project" project={project} />}
      {!actions.includes('archive') && <ArchiveItem project={project} />}
    </>
  )
}
