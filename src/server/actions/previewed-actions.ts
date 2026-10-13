import type { SplitRules } from '../check-project.ts'
import type { ActionOptions } from './action-options.ts'
import type { Actions } from './actions-contract.ts'
import { deleteClone, previewDeleteClone } from './delete-clone.ts'
import { deleteFork, previewDeleteFork } from './delete-fork.ts'
import { discardClone, previewDiscard } from './discard.ts'
import { fixFiles, previewFixFiles } from './fix-files.ts'

/** The actions that show what they would do before they are confirmed: the delete of a clone, the delete of a fork, the discard and the file fixes */
export type PreviewedActions = Pick<Actions, 'deleteClone' | 'deleteFork' | 'discard' | 'fixFiles' | 'previewDeleteClone' | 'previewDeleteFork' | 'previewDiscard' | 'previewFixFiles'>

/**
 * Build the actions that show what they would do first, each one proves again before it acts
 * @param options reads what an action needs for a project, the owner is read when an action runs
 * @param rules the rules split by flavor, the file rules plan the file fixes
 * @returns the actions
 * @example const actions = createPreviewedActions(options, rules)
 */
export function createPreviewedActions(options: (name: string) => Promise<ActionOptions>, rules: SplitRules): PreviewedActions {
  return {
    deleteClone: async name => deleteClone(await options(name)),
    deleteFork: async name => deleteFork(await options(name)),
    discard: async (name, fingerprint) => discardClone({ ...(await options(name)), fingerprint }),
    fixFiles: async (name, fingerprint) => fixFiles({ ...(await options(name)), fingerprint, rules }),
    previewDeleteClone: async name => previewDeleteClone(await options(name)),
    previewDeleteFork: async name => previewDeleteFork(await options(name)),
    previewDiscard: async name => previewDiscard(await options(name)),
    previewFixFiles: async name => previewFixFiles({ ...(await options(name)), rules }),
  }
}
