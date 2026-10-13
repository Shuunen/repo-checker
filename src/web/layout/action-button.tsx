import { Button } from '@heroui/react'
import type { ActionKind } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { actionLabels } from '../projects/rows.ts'
import { CloneButton } from './clone-button.tsx'

/**
 * One action of a project: Clone works, the others are not built yet so their button is disabled
 * @param props the props
 * @param props.action the action
 * @param props.project the project
 * @param props.target the folder of projects
 * @returns the button
 */
export function ActionButton({ action, project, target }: Readonly<{ action: ActionKind; project: Project; target: string }>) {
  if (action === 'clone') return <CloneButton project={project} target={target} />
  return (
    <Button data-testid={`action-${action}`} isDisabled size="sm" variant="outline">
      {actionLabels[action]}
    </Button>
  )
}
