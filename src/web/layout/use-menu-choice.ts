import { useLocation } from 'wouter'
import type { Project } from '../../shared/project.ts'
import { projectHref } from '../projects/rows.ts'
import { useChosenAction } from './use-chosen-action.ts'

/**
 * What an item of the Actions menu does when chosen: the project view and the repo on GitHub open right away, any other item is an action that opens its confirmation
 * @param project the project
 * @returns the handler of the menu, the action chosen and the ref of the holder of its button
 * @example const { chosen, handleChoice, holder } = useMenuChoice(project)
 */
export function useMenuChoice(project: Readonly<Project>) {
  const { chosen, handleAction, holder } = useChosenAction()
  const [, navigate] = useLocation()
  const handleChoice = (key: unknown) => {
    if (key === 'open-project') navigate(projectHref(project.name))
    else if (key === 'open-github' && project.github !== undefined) globalThis.open(`https://github.com/${project.github.owner}/${project.github.name}`, '_blank', 'noopener,noreferrer')
    else handleAction(key)
  }
  return { chosen, handleChoice, holder }
}
