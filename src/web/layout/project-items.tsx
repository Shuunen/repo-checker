import { ArrowRight, ExternalLink } from 'lucide-react'
import type { ActionKind } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { canUpdate } from '../projects/can-update.ts'
import { ActionItem } from './action-item.tsx'
import { ArchiveItem } from './archive-item.tsx'
import { LinkItem } from './link-item.tsx'

/**
 * The first items of the menu: Open project, Open on GitHub, one item per action, Update project and Archive on GitHub or Unarchive on GitHub
 * @param props the props
 * @param props.actions the actions the project offers
 * @param props.project the project
 * @returns the items
 */
export function ProjectItems({ actions, project }: Readonly<{ actions: readonly ActionKind[]; project: Project }>) {
  return (
    <>
      <LinkItem icon={ArrowRight} id="open-project" label="Open project" />
      {project.github !== undefined && <LinkItem icon={ExternalLink} id="open-github" label="Open on GitHub" />}
      {actions.map(action => (
        <ActionItem action={action} key={action} project={project} />
      ))}
      {canUpdate(project) && <ActionItem action="update-project" project={project} />}
      {!actions.includes('archive') && <ArchiveItem project={project} />}
    </>
  )
}
