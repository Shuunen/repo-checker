import type { SplitRules } from '../check-project.ts'
import type { ProjectMemory } from '../project-memory.ts'
import type { ActionOptions } from './action-options.ts'
import type { Actions } from './actions-contract.ts'
import { liveProject, rescanProject } from './live.ts'

/** What scanning a project alone and watching it need */
export interface WatchContext {
  /** What the server remembers about the projects, shared with the scan */
  memory: ProjectMemory
  /** The rules, to check a project again */
  rules: SplitRules
}

/**
 * The actions that read a project again: the rescan after an action, and the watch of the open project
 * @param options builds the options of an action from a repo name
 * @param context what they need
 * @param context.memory what the server remembers about the projects
 * @param context.rules the rules split by flavor
 * @returns the actions
 * @example const { live, rescan } = createWatchActions(options, { memory, rules })
 */
export function createWatchActions(options: (name: string) => Promise<ActionOptions>, { memory, rules }: Readonly<WatchContext>): Pick<Actions, 'live' | 'rescan'> {
  return {
    live: async (name, since) => liveProject({ ...(await options(name)), memory, rules, since }),
    rescan: async name => rescanProject({ ...(await options(name)), memory, rules }),
  }
}
