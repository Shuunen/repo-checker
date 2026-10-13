import { Button } from '@heroui/react'
import type { ActionKind } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { actionLabels } from '../projects/rows.ts'
import { CloneButton } from './clone-button.tsx'
import { DeleteCloneButton } from './delete-clone-button.tsx'
import { UnarchivePushButton } from './unarchive-push-button.tsx'

/**
 * One action of a project: Clone, Delete clone and Unarchive & push work, the others are not built yet so their button is disabled
 * @param props the props
 * @param props.action the action
 * @param props.project the project
 * @param props.target the folder of projects
 * @returns the button
 */
export function ActionButton({ action, project, target }: Readonly<{ action: ActionKind; project: Project; target: string }>) {
  if (action === 'clone') return <CloneButton project={project} target={target} />
  if (action === 'delete-clone') return <DeleteCloneButton project={project} />
  if (action === 'unarchive-push-rearchive') return <UnarchivePushButton project={project} />
  return (
    <Button data-testid={`action-${action}`} isDisabled size="sm" variant="outline">
      {actionLabels[action]}
    </Button>
  )
}
