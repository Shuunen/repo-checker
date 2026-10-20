/** The actions that show what they would do before they are confirmed, a route of the server each */
export type PreviewedAction = 'delete-branches' | 'delete-clone' | 'delete-fork' | 'delete-project' | 'discard' | 'fix-files' | 'fix-git' | 'sync-github-metadata'

/**
 * Ask the server what an action would do, before it is confirmed. The server proves again, with fresh data from GitHub and git, that the action is still right, so this takes a few seconds. A refusal is an answer (`ok: false` with its reason), not an error
 * @template Preview the shape of the answer, `ok` tells if the action is offered
 * @param name the repo name
 * @param action the action
 * @returns what the action would do, or the reason it is refused
 * @example const preview = await getPreview<DeletePreview>('jozzo', 'delete-clone')
 */
export async function getPreview<Preview extends { ok: boolean }>(name: string, action: PreviewedAction) {
  const response = await fetch(`/api/projects/${encodeURIComponent(name)}/${action}`)
  return (await response.json().catch(() => ({ ok: false, reason: `the server answered HTTP ${response.status}` }))) as Preview
}
