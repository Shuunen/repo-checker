import type { Project } from '../../shared/project.ts'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { canArchive, canUnarchive } from '../project/detail.ts'
import { OpenVscodeButton } from '../project/open-vscode-button.tsx'
import { ArchiveButton } from './archive/archive-button.tsx'
import { canDeleteBranches, canUpdate, hasMajorUpdate } from './can-update.ts'
import { DeleteBranchesButton } from './delete/delete-branches-button.tsx'
import { DeleteProjectButton } from './delete/delete-project-button.tsx'
import { UpdateProjectButton } from './update/update-project-button.tsx'

/** What `ProjectButtons` shows and does */
interface ProjectButtonsProps {
  /** The actions the findings offer, the archive may already be one of them */
  actions: readonly string[]
  /** The findings */
  findings: readonly ScanFinding[]
  /** The project */
  project: Project
}

/**
 * The buttons of the actions that come from the state of the project, not from a finding
 * @param props the props
 * @returns the buttons, the delete of the project is always there
 */
export function ProjectButtons({ actions, findings, project }: Readonly<ProjectButtonsProps>) {
  return (
    <>
      {canDeleteBranches(project) && <DeleteBranchesButton project={project} />}
      {canUpdate(project, hasMajorUpdate(findings)) && <UpdateProjectButton project={project} />}
      {canArchive(project) && !actions.includes('archive') && <ArchiveButton action="archive" project={project} />}
      {canUnarchive(project) && <ArchiveButton action="unarchive" project={project} />}
      <OpenVscodeButton project={project} />
      <DeleteProjectButton project={project} />
    </>
  )
}
