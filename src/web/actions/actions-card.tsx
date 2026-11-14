import { Card } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { offeredActions } from '../project/detail.ts'
import { ActionButton } from './action-button.tsx'
import { ProjectButtons } from './project-buttons.tsx'

/** What `ActionsCard` shows and does */
interface ActionsCardProps {
  /** The findings */
  findings: readonly ScanFinding[]
  /** The project */
  project: Project
  /** The folder of projects */
  target: string
}

/**
 * The actions the findings offer. Each one asks for a confirmation first. Each one asks you to confirm again
 * @param props the props
 * @returns the card, it always holds the delete of the project
 */
export function ActionsCard({ findings, project, target }: Readonly<ActionsCardProps>) {
  const actions = offeredActions(findings)
  return (
    <Card data-testid="actions">
      <Card.Title>Actions</Card.Title>
      <span className="flex flex-wrap gap-2">
        {actions.map(action => (
          <ActionButton action={action} key={action} project={project} target={target} />
        ))}
        <ProjectButtons actions={actions} findings={findings} project={project} />
      </span>
    </Card>
  )
}
