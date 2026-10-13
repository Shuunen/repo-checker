import type { ActionResult } from '../../shared/action.ts'
import { type GhRunner, getLogin } from '../inventory/github.ts'
import { cloneRepo } from './clone.ts'

/** The actions the page can ask for, each one proves again that it is still safe before it acts */
export interface Actions {
  /** Clone a repo of the owner into the folder of projects */
  clone: (name: string) => Promise<ActionResult>
}

/**
 * The actions of a server started on a folder. The owner is the gh login unless given, read when an action runs
 * @param gh runs gh
 * @param owner the GitHub owner given with `--owner`, undefined for the gh login
 * @param target the folder of projects
 * @returns the actions
 * @example const actions = createActions(ghCli, undefined, '/home/me/projects')
 */
export function createActions(gh: GhRunner, owner: string | undefined, target: string): Actions {
  return { clone: async name => cloneRepo({ gh, name, owner: owner ?? (await getLogin(gh)), target }) }
}
