import type { Project } from '../../shared/project.ts'
import { canArchive, canUnarchive } from '../projects/detail.ts'
import { ActionItem } from './action-item.tsx'

/** What `ArchiveItem` shows and does */
interface ArchiveItemProps {
  /** The project */
  project: Project
}

/**
 * The Archive item of the menu for a repo that is not archived, the Unarchive item for one that is, nothing for a project that is not on GitHub
 * @param props the props
 * @returns the item, or nothing
 */
export function ArchiveItem({ project }: Readonly<ArchiveItemProps>) {
  if (canArchive(project)) return <ActionItem action="archive" project={project} />
  return canUnarchive(project) ? <ActionItem action="unarchive" project={project} /> : undefined
}
