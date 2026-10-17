import type { Project } from '../../shared/project.ts'
import { canArchive, canUnarchive } from '../projects/detail.ts'
import { ActionItem } from './action-item.tsx'

/**
 * The Archive item of the menu for a repo that is not archived, the Unarchive item for one that is, nothing for a project that is not on GitHub
 * @param props the props
 * @param props.project the project
 * @returns the item, or nothing
 */
export function ArchiveItem({ project }: Readonly<{ project: Project }>) {
  if (canArchive(project)) return <ActionItem action="archive" project={project} />
  return canUnarchive(project) ? <ActionItem action="unarchive" project={project} /> : undefined
}
