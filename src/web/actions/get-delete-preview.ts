import type { DeletePreview } from '../../shared/action.ts'

/**
 * Ask the server what deleting the clone of a project would remove. The server proves again, with a fresh git fetch, that the delete is safe, so this takes a few seconds. A refusal is an answer, not an error
 * @param name the repo name
 * @returns the path and the ignored files that would be lost, or the reason the delete is refused
 * @example const preview = await getDeletePreview('jozzo')
 */
export async function getDeletePreview(name: string) {
  const response = await fetch(`/api/projects/${encodeURIComponent(name)}/delete-clone`)
  return (await response.json().catch((): DeletePreview => ({ ok: false, reason: `the server answered HTTP ${response.status}` }))) as DeletePreview
}
