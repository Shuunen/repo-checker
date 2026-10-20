import { Card } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { canDeleteBranches, canUpdate } from '../projects/can-update.ts'
import { canArchive, canUnarchive, offeredActions } from '../projects/detail.ts'
import { ActionButton } from './action-button.tsx'
import { ArchiveButton } from './archive-button.tsx'
import { DeleteBranchesButton } from './delete-branches-button.tsx'
import { DeleteProjectButton } from './delete-project-button.tsx'
import { UpdateProjectButton } from './update-project-button.tsx'

/**
 * The actions the findings offer. Each one asks for a confirmation first. Each one asks you to confirm again
 * @param props the props
 * @param props.findings the findings
 * @param props.project the project
 * @param props.target the folder of projects
 * @returns the card, it always holds the delete of the project
 */
export function ActionsCard({ findings, project, target }: Readonly<{ findings: readonly ScanFinding[]; project: Project; target: string }>) {
  const actions = offeredActions(findings)
  return (
    <Card data-testid="actions">
      <Card.Title>Actions</Card.Title>
      <span className="flex flex-wrap gap-2">
        {actions.map(action => (
          <ActionButton action={action} key={action} project={project} target={target} />
        ))}
        {canDeleteBranches(project) && <DeleteBranchesButton project={project} />}
        {canUpdate(project) && <UpdateProjectButton project={project} />}
        {canArchive(project) && !actions.includes('archive') && <ArchiveButton action="archive" project={project} />}
        {canUnarchive(project) && <ArchiveButton action="unarchive" project={project} />}
        <DeleteProjectButton isLabelled project={project} />
      </span>
    </Card>
  )
}
