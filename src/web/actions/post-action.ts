import type { ActionResult } from '../../shared/action.ts'

/** The actions that change something, a route of the server each */
type PostedAction = 'checkout-default' | 'clone' | 'delete-clone' | 'delete-fork' | 'delete-project' | 'discard' | 'fix-files' | 'unarchive-push'

/**
 * Ask the server to run an action on a project. The `x-repo-check` header is required by the server for any request that changes something
 * @param name the repo name
 * @param action the action
 * @param fingerprint the fingerprint of the list the user confirmed, for the actions that throw something away
 * @returns nothing when the action worked
 * @throws {Error} with the reason when the server refused it or it failed
 * @example await postAction('finga', 'clone')
 */
export async function postAction(name: string, action: PostedAction, fingerprint?: string) {
  const query = fingerprint === undefined ? '' : `?fingerprint=${encodeURIComponent(fingerprint)}`
  const response = await fetch(`/api/projects/${encodeURIComponent(name)}/${action}${query}`, { headers: { 'x-repo-check': '1' }, method: 'POST' })
  const result = await response.json().catch((): ActionResult => ({ ok: false, reason: `the server answered HTTP ${response.status}` }))
  if (!(result as ActionResult).ok) throw new Error((result as { reason: string }).reason)
}

/** What the toast says once an action worked, `{name}` being the project */
export const doneMessages: Record<PostedAction, string> = {
  'checkout-default': 'Checked out the default branch of {name}',
  clone: 'Cloned {name}',
  'delete-clone': 'Deleted the clone of {name}',
  'delete-fork': 'Deleted the fork of {name}',
  'delete-project': 'Deleted {name}, its GitHub repo and its clone',
  discard: 'Discarded the unsaved work of {name}',
  'fix-files': 'Fixed the files of {name}',
  'unarchive-push': 'Unarchived and pushed {name}',
}
