import { Card } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { offeredActions } from '../projects/detail.ts'
import { ActionButton } from './action-button.tsx'

/**
 * The actions the findings offer. Each one asks for a confirmation first. Only Clone is built, the other buttons are disabled
 * @param props the props
 * @param props.findings the findings
 * @param props.project the project
 * @param props.target the folder of projects
 * @returns the card, or nothing when no action is offered
 */
export function ActionsCard({ findings, project, target }: Readonly<{ findings: readonly ScanFinding[]; project: Project; target: string }>) {
  const actions = offeredActions(findings)
  if (actions.length === 0) return undefined
  return (
    <Card data-testid="actions">
      <Card.Title>Actions</Card.Title>
      <Card.Description>Each action asks you to confirm first. Only Clone is built, the other buttons are disabled.</Card.Description>
      <span className="flex gap-2">
        {actions.map(action => (
          <ActionButton action={action} key={action} project={project} target={target} />
        ))}
      </span>
    </Card>
  )
}
