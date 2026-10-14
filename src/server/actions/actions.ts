import type { SplitRules } from '../check-project.ts'
import { type GhRunner, getLogin } from '../inventory/github.ts'
import { archiveRepo, unarchiveRepo } from './archive.ts'
import { checkoutDefault } from './checkout-default.ts'
import { cloneRepo } from './clone.ts'
import { realGit, realRunGit } from './action-options.ts'
import type { Actions } from './actions-contract.ts'
import { createPreviewedActions } from './previewed-actions.ts'
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
    ...createPreviewedActions(options, rules),
    archive: async name => archiveRepo(await options(name)),
    checkoutDefault: async name => checkoutDefault(await options(name)),
    clone: async name => cloneRepo({ ...(await options(name)), runGit: realRunGit }),
    rescan: async name => rescanProject({ ...(await options(name)), rules }),
    unarchive: async name => unarchiveRepo(await options(name)),
    unarchivePush: async name => unarchivePush(await options(name)),
  }
}
