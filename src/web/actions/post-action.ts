import type { ActionResult } from '../../shared/action.ts'

/** The actions that change something, a route of the server each */
type PostedAction = 'clone' | 'delete-clone'

/**
 * Ask the server to run an action on a project. The `x-repo-check` header is required by the server for any request that changes something
 * @param name the repo name
 * @param action the action
 * @returns nothing when the action worked
 * @throws {Error} with the reason when the server refused it or it failed
 * @example await postAction('finga', 'clone')
 */
export async function postAction(name: string, action: PostedAction) {
  const response = await fetch(`/api/projects/${encodeURIComponent(name)}/${action}`, { headers: { 'x-repo-check': '1' }, method: 'POST' })
  const result = await response.json().catch((): ActionResult => ({ ok: false, reason: `the server answered HTTP ${response.status}` }))
  if (!(result as ActionResult).ok) throw new Error((result as { reason: string }).reason)
}
