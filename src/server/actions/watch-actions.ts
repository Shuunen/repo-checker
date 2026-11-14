import { refused } from '../../shared/action.ts'
import type { SplitRules } from '../inventory/check-project.ts'
import { type IgnoredRules, neverIgnored } from '../inventory/ignored-rules.ts'
import type { ProjectMemory } from '../inventory/project-memory.ts'
import { type ActionOptions, repoNameOf } from './action-options.ts'
import type { Actions } from './actions-contract.ts'
import { liveProject, rescanProject } from './live.ts'

/** What a rule id looks like: lowercase words joined by dashes */
const ruleIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

/** What scanning a project alone and watching it need */
export interface WatchContext {
  /** The rules the user ignored for a while, none when omitted */
  ignored?: IgnoredRules | undefined
  /** What the server remembers about the projects, shared with the scan */
  memory: ProjectMemory
  /** The rules, to check a project again */
  rules: SplitRules
}

/**
 * The actions that read a project again: the rescan after an action, and the watch of the open project
 * @param options builds the options of an action from a repo name
 * @param context what they need
 * @param context.ignored the rules the user ignored
 * @param context.memory what the server remembers about the projects
 * @param context.rules the rules split by flavor
 * @returns the actions
 * @example const { live, rescan } = createWatchActions(options, { memory, rules })
 */
export function createWatchActions(options: (name: string) => Promise<ActionOptions>, { ignored = neverIgnored, memory, rules }: Readonly<WatchContext>): Pick<Actions, 'ignoreRule' | 'live' | 'rescan'> {
  return {
    ignoreRule: async (name, ruleId) => {
      if (!ruleIdPattern.test(ruleId)) return refused(`${ruleId} is not a rule id`)
      await ignored.ignore(repoNameOf(name), ruleId)
      return { message: `ignored ${ruleId} on ${name} for 24 hours`, ok: true }
    },
    live: async (name, since) => liveProject({ ...(await options(name)), ignored, memory, rules, since }),
    rescan: async name => rescanProject({ ...(await options(name)), memory, rules }, ignored),
  }
}
