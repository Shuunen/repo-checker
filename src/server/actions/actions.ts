import type { SplitRules } from '../check-project.ts'
import { type GhRunner, getLogin } from '../inventory/github.ts'
import { cloneRepo } from './clone.ts'
import { realGit, realRunGit } from './action-options.ts'
import type { Actions } from './actions-contract.ts'
import { deleteClone, previewDeleteClone } from './delete-clone.ts'
import { deleteFork, previewDeleteFork } from './delete-fork.ts'
import { discardClone, previewDiscard } from './discard.ts'
import { rescanProject } from './rescan.ts'
import { unarchivePush } from './unarchive-push.ts'

/** What the actions of a server need */
interface ActionsContext {
  /** Runs gh */
  gh: GhRunner
  /** The GitHub owner given with `--owner`, undefined for the gh login */
  owner: string | undefined
  /** The rules, to scan one project again after an action */
  rules: SplitRules
  /** The folder of projects */
  target: string
}

/**
 * The actions of a server started on a folder. The owner is the gh login unless given, read when an action runs
 * @param context what the actions need
 * @param context.gh runs gh
 * @param context.owner the GitHub owner given with `--owner`
 * @param context.rules the rules split by flavor
 * @param context.target the folder of projects
 * @returns the actions
 * @example const actions = createActions({ gh: ghCli, owner: undefined, rules, target: '/home/me/projects' })
 */
export function createActions({ gh, owner, rules, target }: Readonly<ActionsContext>): Actions {
  const options = async (name: string) => ({ gh, git: realGit, name, owner: owner ?? (await getLogin(gh)), target })
  return {
    clone: async name => cloneRepo({ ...(await options(name)), runGit: realRunGit }),
    deleteClone: async name => deleteClone(await options(name)),
    deleteFork: async name => deleteFork(await options(name)),
    discard: async (name, fingerprint) => discardClone({ ...(await options(name)), fingerprint }),
    previewDeleteClone: async name => previewDeleteClone(await options(name)),
    previewDeleteFork: async name => previewDeleteFork(await options(name)),
    previewDiscard: async name => previewDiscard(await options(name)),
    rescan: async name => rescanProject({ ...(await options(name)), rules }),
    unarchivePush: async name => unarchivePush(await options(name)),
  }
}
