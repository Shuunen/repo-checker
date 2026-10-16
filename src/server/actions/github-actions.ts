import type { ActionOptions } from './action-options.ts'
import type { Actions } from './actions-contract.ts'
import { archiveRepo, unarchiveRepo } from './archive.ts'
import { previewSyncGithubMetadata, syncGithubMetadata } from './github-metadata.ts'

/** The actions that change the repo on GitHub */
export type GithubActions = Pick<Actions, 'archive' | 'previewSyncGithubMetadata' | 'syncGithubMetadata' | 'unarchive'>

/**
 * Build the actions that change the repo on GitHub, each one proves again before it acts
 * @param options reads what an action needs for a project, the owner is read when an action runs
 * @returns the actions
 * @example const actions = createGithubActions(options)
 */
export function createGithubActions(options: (name: string) => Promise<ActionOptions>): GithubActions {
  return {
    archive: async name => archiveRepo(await options(name)),
    previewSyncGithubMetadata: async name => previewSyncGithubMetadata(await options(name)),
    syncGithubMetadata: async (name, values) => syncGithubMetadata(await options(name), values),
    unarchive: async name => unarchiveRepo(await options(name)),
  }
}
