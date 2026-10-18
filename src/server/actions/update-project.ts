import type { ActionResult } from '../../shared/action.ts'
import { spawnClaude } from './claude-process.ts'
import { type ChatListener, type ClaudeSessions, createClaudeSessions } from './claude-session.ts'
import type { ActionOptions } from './action-options.ts'
import type { Actions } from './actions-contract.ts'
import { findClone } from './fix-plan.ts'
import { isRepoName } from './guards.ts'

/** The actions of the update with Claude, and the way to stop every session when the server stops */
export type UpdateActions = Pick<Actions, 'closeUpdateProject' | 'sendUpdateMessage' | 'startUpdateProject' | 'stopSessions' | 'watchUpdateProject'>

/**
 * Start Claude on the update skill in the clone of a project, after proving the project has a usable clone of the owner. Nothing is written by this tool, Claude does, in the clone, and the session lasts until it is closed
 * @param options what to update
 * @param sessions the sessions
 * @returns the result, refused with the reason when there is no usable clone or a session already runs
 * @example const result = await startUpdateProject({ gh: ghCli, git: realGit, name: 'finga', owner: 'Shuunen', target }, sessions)
 */
export async function startUpdateProject(options: Readonly<ActionOptions>, sessions: ClaudeSessions): Promise<ActionResult> {
  try {
    if (!isRepoName(options.name)) return { ok: false, reason: `${options.name} is not a repo name` }
    const found = await findClone(options)
    return 'reason' in found ? { ok: false, reason: found.reason } : sessions.start(options.name, found.clone.path)
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Build the actions of the update with Claude
 * @param options reads what an action needs for a project
 * @param sessions the sessions, the ones that run the real claude by default
 * @returns the actions
 */
export function createUpdateActions(options: (name: string) => Promise<ActionOptions>, sessions: ClaudeSessions = createClaudeSessions(spawnClaude)): UpdateActions {
  return {
    closeUpdateProject: name => Promise.resolve(sessions.close(name)),
    sendUpdateMessage: (name, text) => Promise.resolve(sessions.send(name, text)),
    startUpdateProject: async name => startUpdateProject(await options(name), sessions),
    stopSessions: () => sessions.closeAll(),
    watchUpdateProject: (name: string, listener: ChatListener) => sessions.watch(name, listener),
  }
}
