import type { SplitRules } from '../check-project.ts'
import type { ActionOptions } from './action-options.ts'
import type { Actions } from './actions-contract.ts'
import { deleteClone, previewDeleteClone } from './delete-clone.ts'
import { deleteFork, previewDeleteFork } from './delete-fork.ts'
import { deleteProject, previewDeleteProject } from './delete-project.ts'
import { discardClone, previewDiscard } from './discard.ts'
import { fixFiles, previewFixFiles } from './fix-files.ts'

/** The actions that show what they would do before they are confirmed: the delete of a clone, the delete of a fork, the delete of a whole project, the discard and the file fixes */
export type PreviewedActions = Pick<Actions, 'deleteClone' | 'deleteFork' | 'deleteProject' | 'discard' | 'fixFiles' | 'previewDeleteClone' | 'previewDeleteFork' | 'previewDeleteProject' | 'previewDiscard' | 'previewFixFiles'>

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
    deleteProject: async name => deleteProject(await options(name)),
    discard: async (name, fingerprint) => discardClone({ ...(await options(name)), fingerprint }),
    fixFiles: async (name, fingerprint, run = {}) => fixFiles({ ...(await options(name)), ...run, fingerprint, rules }),
    previewDeleteClone: async name => previewDeleteClone(await options(name)),
    previewDeleteFork: async name => previewDeleteFork(await options(name)),
    previewDeleteProject: async name => previewDeleteProject(await options(name)),
    previewDiscard: async name => previewDiscard(await options(name)),
    previewFixFiles: async name => previewFixFiles({ ...(await options(name)), rules }),
  }
}
