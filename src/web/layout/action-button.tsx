import type { ReactNode } from 'react'
import type { ActionKind } from '../../shared/action.ts'
import { ArchiveButton } from './archive-button.tsx'
import { type ButtonProps, cloneButtons } from './clone-buttons.tsx'
import { DiscardButton } from './discard-button.tsx'
import { SyncGithubMetadataButton } from './sync-github-metadata-button.tsx'
import { UnarchivePushButton } from './unarchive-push-button.tsx'

/** The button of each action, it opens the confirmation of that action */
const buttons: Readonly<Record<ActionKind, (props: Readonly<ButtonProps>) => ReactNode>> = {
  archive: ({ project }) => <ArchiveButton action="archive" project={project} />,
  ...cloneButtons,
  discard: ({ project }) => <DiscardButton project={project} />,
  'sync-github-metadata': ({ project }) => <SyncGithubMetadataButton project={project} />,
  'unarchive-push': ({ project }) => <UnarchivePushButton project={project} />,
}

/**
 * One action of a project, the button of its confirmation: each one asks the server to prove again before anything happens
 * @param props the props
 * @returns the button
 */
export function ActionButton({ action, project, target }: Readonly<ButtonProps & { action: ActionKind }>) {
  return buttons[action]({ project, target })
}
