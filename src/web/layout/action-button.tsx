import type { ReactNode } from 'react'
import type { ActionKind } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { CheckoutDefaultButton } from './checkout-default-button.tsx'
import { CloneButton } from './clone-button.tsx'
import { DeleteCloneButton } from './delete-clone-button.tsx'
import { DeleteForkButton } from './delete-fork-button.tsx'
import { DiscardButton } from './discard-button.tsx'
import { UnarchivePushButton } from './unarchive-push-button.tsx'

/** What every button needs to open its confirmation */
interface ButtonProps {
  /** True for the long label of the project page, false for the short one of a row */
  isLabelled?: boolean
  /** The project */
  project: Project
  /** The folder of projects */
  target: string
}

/** The button of each action, it opens the confirmation of that action */
const buttons: Readonly<Record<ActionKind, (props: Readonly<ButtonProps>) => ReactNode>> = {
  'checkout-default': ({ isLabelled, project }) => <CheckoutDefaultButton isLabelled={isLabelled === true} project={project} />,
  clone: ({ project, target }) => <CloneButton project={project} target={target} />,
  'delete-clone': ({ project }) => <DeleteCloneButton project={project} />,
  'delete-fork': ({ project }) => <DeleteForkButton project={project} />,
  discard: ({ project }) => <DiscardButton project={project} />,
  'unarchive-push-rearchive': ({ project }) => <UnarchivePushButton project={project} />,
}

/**
 * One action of a project, the button of its confirmation: each one asks the server to prove again before anything happens
 * @param props the props
 * @param props.action the action
 * @param props.isLabelled true for the long label of the project page
 * @param props.project the project
 * @param props.target the folder of projects
 * @returns the button
 */
export function ActionButton({ action, isLabelled = false, project, target }: Readonly<ButtonProps & { action: ActionKind }>) {
  return buttons[action]({ isLabelled, project, target })
}
