import type { ProjectAction } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'

/** What the menu shows of an action */
interface ActionMeta {
  /** The path of the icon, drawn on a 24px grid */
  icon: string
  /** The long label */
  label: string
}

/**
 * The long label and the icon of an action
 * @param action the action
 * @param project the project, its default branch names the checkout
 * @returns the label and the icon path
 * @example actionMeta('clone', project).label // 'Clone the repo'
 */
export function actionMeta(action: ProjectAction, project: Readonly<Project>): ActionMeta {
  const metas: Readonly<Record<ProjectAction, ActionMeta>> = {
    archive: { icon: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4', label: 'Archive on GitHub' },
    'checkout-default': { icon: 'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9', label: `Checkout ${project.github?.defaultBranch ?? 'default'} branch` },
    clone: { icon: 'M12 3v12M7 10l5 5 5-5M5 21h14', label: 'Clone the repo' },
    'delete-clone': { icon: 'M3 7h6l2 2h10v10H3zM9 14h6', label: 'Delete the local clone' },
    'delete-fork': { icon: 'M6 3v6a6 6 0 0 0 12 0V3M12 15v6M9 3h.01M15 3h.01', label: 'Delete the fork on GitHub' },
    'delete-project': { icon: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6', label: 'Delete project' },
    discard: { icon: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3', label: 'Discard the unsaved work' },
    'sync-github-metadata': { icon: 'M4 12h12M12 6l6 6-6 6M20 4v16', label: 'Sync infos' },
    unarchive: { icon: 'M3 4h18v4H3zM5 8v12h14V8M12 17v-5M9.5 14.5L12 12l2.5 2.5', label: 'Unarchive on GitHub' },
    'unarchive-push-rearchive': { icon: 'M12 21V9M7 14l5-5 5 5M5 3h14', label: 'Unarchive, push and archive again' },
  }
  return metas[action]
}
