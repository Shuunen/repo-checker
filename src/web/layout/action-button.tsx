import { Button } from '@heroui/react'
import type { ActionKind } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { actionLabels } from '../projects/rows.ts'
import { CloneButton } from './clone-button.tsx'
import { DeleteCloneButton } from './delete-clone-button.tsx'
import { DiscardButton } from './discard-button.tsx'
import { UnarchivePushButton } from './unarchive-push-button.tsx'

/**
 * One action of a project: Every action works except Delete fork, whose button is disabled until it is built
 * @param props the props
 * @param props.action the action
 * @param props.project the project
 * @param props.target the folder of projects
 * @returns the button
 */
export function ActionButton({ action, project, target }: Readonly<{ action: ActionKind; project: Project; target: string }>) {
  if (action === 'clone') return <CloneButton project={project} target={target} />
  if (action === 'delete-clone') return <DeleteCloneButton project={project} />
  if (action === 'discard') return <DiscardButton project={project} />
  if (action === 'unarchive-push-rearchive') return <UnarchivePushButton project={project} />
  return (
    <Button data-testid={`action-${action}`} isDisabled size="sm" variant="outline">
      {actionLabels[action]}
    </Button>
  )
}
