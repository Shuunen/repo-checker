import type { ActionResult } from '../../shared/action.ts'

/**
 * Ask the server to clone a repo. The `x-repo-check` header is required by the server for any request that changes something
 * @param name the repo name
 * @returns nothing when the clone worked
 * @throws {Error} with the reason when the server refused it or it failed
 * @example await postClone('finga')
 */
export async function postClone(name: string) {
  const response = await fetch(`/api/projects/${encodeURIComponent(name)}/clone`, { headers: { 'x-repo-check': '1' }, method: 'POST' })
  const result = await response.json().catch((): ActionResult => ({ ok: false, reason: `the server answered HTTP ${response.status}` }))
  if (!(result as ActionResult).ok) throw new Error((result as { reason: string }).reason)
}
