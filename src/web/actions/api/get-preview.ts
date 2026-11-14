import { type PostedAction, refused } from '../../../shared/action.ts'

/**
 * Ask the server what an action would do, before it is confirmed. The server proves again, with fresh data from GitHub and git, that the action is still right, so this takes a few seconds. A refusal is an answer (`ok: false` with its reason), not an error
 * @template Preview the shape of the answer, `ok` tells if the action is offered
 * @param name the repo name
 * @param action the action, one that has a preview
 * @param rule only what the findings of this rule would do, for the file fixes
 * @returns what the action would do, or the reason it is refused
 * @example const preview = await getPreview<DeletePreview>('jozzo', 'delete-clone')
 */
export async function getPreview<Preview extends { ok: boolean }>(name: string, action: PostedAction, rule?: string) {
  const response = await fetch(`/api/projects/${encodeURIComponent(name)}/${action}${rule === undefined ? '' : `?rule=${encodeURIComponent(rule)}`}`)
  return (await response.json().catch(() => refused(`the server answered HTTP ${response.status}`))) as Preview
}
