import { Card } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { offeredActions } from '../projects/detail.ts'
import { ActionButton } from './action-button.tsx'
import { DeleteProjectButton } from './delete-project-button.tsx'

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
      <Card.Description>Each action asks you to confirm first, and the server proves again that it is still right when you do.</Card.Description>
      <span className="flex gap-2">
        {actions.map(action => (
          <ActionButton action={action} isLabelled key={action} project={project} target={target} />
        ))}
        <DeleteProjectButton isLabelled project={project} />
      </span>
    </Card>
  )
}
