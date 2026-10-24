import { useState } from 'react'
import { useLocation } from 'wouter'
import type { ProjectAction } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { projectHref } from '../projects/rows.ts'

/** The action chosen in the menu, and how many times one was chosen, so choosing the same action again opens its dialog again */
interface Choice {
  /** The action */
  action: ProjectAction
  /** How many times an action was chosen, the key of the dialog */
  count: number
}

/**
 * What the Actions menu of a project does with a choice: open the project page, open GitHub, or keep the action, whose dialog then opens
 * @param project the project of the menu
 * @returns the chosen action, and what handles a choice
 * @example const { choice, handleChoice } = useMenuChoice(project)
 */
export function useMenuChoice(project: Readonly<Project>) {
  const [choice, setChoice] = useState<Choice>()
  const [, navigate] = useLocation()
  const handleChoice = (key: unknown) => {
    if (key === 'open-project') navigate(projectHref(project.name))
    else if (key === 'open-github' && project.github !== undefined) globalThis.open(`https://github.com/${project.github.owner}/${project.github.name}`, '_blank', 'noopener,noreferrer')
    else setChoice(previous => ({ action: key as ProjectAction, count: (previous?.count ?? 0) + 1 }))
  }
  return { choice, handleChoice }
}
