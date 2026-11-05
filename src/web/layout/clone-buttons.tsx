import type { ReactNode } from 'react'
import type { Project } from '../../shared/project.ts'
import { CheckoutDefaultButton } from './checkout-default-button.tsx'
import { CloneButton } from './clone-button.tsx'
import { DeleteCloneButton } from './delete-clone-button.tsx'
import { DeleteForkButton } from './delete-fork-button.tsx'

/** What every button needs to open its confirmation */
export interface ButtonProps {
  /** The project */
  project: Project
  /** The folder of projects */
  target: string
}

/** The buttons of the actions that change a clone or a fork, each one opens the confirmation of its action */
export const cloneButtons = {
  'checkout-default': ({ project }: Readonly<ButtonProps>): ReactNode => <CheckoutDefaultButton project={project} />,
  clone: ({ project, target }: Readonly<ButtonProps>): ReactNode => <CloneButton project={project} target={target} />,
  'delete-clone': ({ project }: Readonly<ButtonProps>): ReactNode => <DeleteCloneButton project={project} />,
  'delete-fork': ({ project }: Readonly<ButtonProps>): ReactNode => <DeleteForkButton project={project} />,
}
