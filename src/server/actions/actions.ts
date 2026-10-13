import type { ActionResult, DeletePreview } from '../../shared/action.ts'
import { type GhRunner, getLogin } from '../inventory/github.ts'
import { cloneRepo } from './clone.ts'
import { deleteClone, previewDeleteClone } from './delete-clone.ts'
import { unarchivePush } from './unarchive-push.ts'

/** The actions the page can ask for, each one proves again that it is still safe before it acts */
export interface Actions {
  /** Clone a repo of the owner into the folder of projects */
  clone: (name: string) => Promise<ActionResult>
  /** Delete the local clone of an archived repo, after proving again that it holds nothing that is not on GitHub */
  deleteClone: (name: string) => Promise<ActionResult>
  /** Say what deleting that clone would remove, the files git ignores, or why it is refused */
  previewDeleteClone: (name: string) => Promise<DeletePreview>
  /** Unarchive an archived repo, push the unsaved branches of its clone, archive it again */
  unarchivePush: (name: string) => Promise<ActionResult>
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
  const options = async (name: string) => ({ gh, name, owner: owner ?? (await getLogin(gh)), target })
  return {
    clone: async name => cloneRepo(await options(name)),
    deleteClone: async name => deleteClone(await options(name)),
    previewDeleteClone: async name => previewDeleteClone(await options(name)),
    unarchivePush: async name => unarchivePush(await options(name)),
  }
}
