import type { ActionResult, DeletePreview, DiscardPreview, ForkDeletePreview } from '../../shared/action.ts'
import { type GhRunner, getLogin } from '../inventory/github.ts'
import { cloneRepo } from './clone.ts'
import { realGit } from './action-options.ts'
import { deleteClone, previewDeleteClone } from './delete-clone.ts'
import { deleteFork, previewDeleteFork } from './delete-fork.ts'
import { discardClone, previewDiscard } from './discard.ts'
import { unarchivePush } from './unarchive-push.ts'

/** The actions the page can ask for, each one proves again that it is still safe before it acts */
export interface Actions {
  /** Clone a repo of the owner into the folder of projects */
  clone: (name: string) => Promise<ActionResult>
  /** Delete the local clone of an archived repo, after proving again that it holds nothing that is not on GitHub */
  deleteClone: (name: string) => Promise<ActionResult>
  /** Say what deleting that clone would remove, the files git ignores, or why it is refused */
  previewDeleteClone: (name: string) => Promise<DeletePreview>
  /** Delete a pristine fork on GitHub, and its clean local clone if it has one */
  deleteFork: (name: string) => Promise<ActionResult>
  /** Throw away the unsaved work of an archived repo's clone, refused unless it is exactly the work the fingerprint stands for */
  discard: (name: string, fingerprint: string) => Promise<ActionResult>
  /** Say what deleting the fork would remove, after proving it is pristine */
  previewDeleteFork: (name: string) => Promise<ForkDeletePreview>
  /** Say what discarding would throw away, with the fingerprint of that list */
  previewDiscard: (name: string) => Promise<DiscardPreview>
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
  const options = async (name: string) => ({ gh, git: realGit, name, owner: owner ?? (await getLogin(gh)), target })
  return {
    clone: async name => cloneRepo(await options(name)),
    deleteClone: async name => deleteClone(await options(name)),
    deleteFork: async name => deleteFork(await options(name)),
    discard: async (name, fingerprint) => discardClone({ ...(await options(name)), fingerprint }),
    previewDeleteClone: async name => previewDeleteClone(await options(name)),
    previewDeleteFork: async name => previewDeleteFork(await options(name)),
    previewDiscard: async name => previewDiscard(await options(name)),
    unarchivePush: async name => unarchivePush(await options(name)),
  }
}
