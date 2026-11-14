import { type GhRunner, createLoginReader } from '../inventory/github.ts'
import { realGit, repoNameOf } from './action-options.ts'
import type { Actions } from './actions-contract.ts'
import { unarchivePush } from './archive/unarchive-push.ts'
import { checkoutDefault } from './clone/checkout-default.ts'
import { cloneRepo } from './clone/clone.ts'
import { createGithubActions } from './github-actions.ts'
import { createPreviewedActions } from './previewed-actions.ts'
import { createUpdateActions } from './update/update-project.ts'
import { createWatchActions, type WatchContext } from './watch-actions.ts'

/** What the actions of a server need */
interface ActionsContext extends WatchContext {
  /** Runs gh */
  gh: GhRunner
  /** The GitHub owner given with `--owner`, undefined for the gh login */
  owner: string | undefined
  /** The folder of projects */
  target: string
}

/**
 * The actions of a server started on a folder. The owner is the gh login unless given, read the first time an action runs and kept: the page watches the open project every few seconds and must not ask GitHub who the user is each time
 * @param context what the actions need
 * @param context.gh runs gh
 * @param context.ignored the rules the user ignored, saved on disk
 * @param context.memory what the server remembers about the projects
 * @param context.owner the GitHub owner given with `--owner`
 * @param context.rules the rules split by flavor
 * @param context.target the folder of projects
 * @returns the actions
 * @example const actions = createActions({ gh: ghCli, memory, owner: undefined, rules, target: '/home/me/projects' })
 */
export function createActions({ gh, ignored, memory, owner, rules, target }: Readonly<ActionsContext>): Actions {
  const login = createLoginReader(gh)
  const ownerOf = () => (owner === undefined ? login() : Promise.resolve(owner))
  const options = async (name: string) => ({ gh, git: realGit, name: repoNameOf(name), owner: await ownerOf(), target })
  return {
    ...createPreviewedActions(options, rules),
    ...createGithubActions(options),
    ...createWatchActions(options, { ignored, memory, rules }),
    ...createUpdateActions(options),
    checkoutDefault: async name => checkoutDefault(await options(name)),
    clone: async name => cloneRepo(await options(name)),
    unarchivePush: async name => unarchivePush(await options(name)),
  }
}
