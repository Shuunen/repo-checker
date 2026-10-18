import { Archive, ArchiveRestore, ArrowRightToLine, ArrowUpToLine, Download, FolderMinus, GitBranch, GitFork, PackageCheck, Trash2, Undo2, type LucideIcon } from 'lucide-react'
import type { ProjectAction } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'

/** What the menu shows of an action */
interface ActionMeta {
  /** The icon component */
  icon: LucideIcon
  /** The long label */
  label: string
}

/**
 * The long label and the icon of an action
 * @param action the action
 * @param project the project, its default branch names the checkout
 * @returns the label and the icon
 * @example actionMeta('clone', project).label // 'Clone the repo'
 */
export function actionMeta(action: ProjectAction, project: Readonly<Project>): ActionMeta {
  const metas: Readonly<Record<ProjectAction, ActionMeta>> = {
    archive: { icon: Archive, label: 'Archive on GitHub' },
    'checkout-default': { icon: GitBranch, label: `Checkout ${project.github?.defaultBranch ?? 'default'} branch` },
    clone: { icon: Download, label: 'Clone the repo' },
    'delete-clone': { icon: FolderMinus, label: 'Delete the local clone' },
    'delete-fork': { icon: GitFork, label: 'Delete the fork on GitHub' },
    'delete-project': { icon: Trash2, label: 'Delete project' },
    discard: { icon: Undo2, label: 'Discard the unsaved work' },
    'sync-github-metadata': { icon: ArrowRightToLine, label: 'Sync infos' },
    unarchive: { icon: ArchiveRestore, label: 'Unarchive on GitHub' },
    'unarchive-push-rearchive': { icon: ArrowUpToLine, label: 'Unarchive, push and archive again' },
    'update-project': { icon: PackageCheck, label: 'Update project' },
  }
  return metas[action]
}
