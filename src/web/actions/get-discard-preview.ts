import type { DiscardPreview } from '../../shared/action.ts'

/**
 * Ask the server what a discard would throw away. The server proves again, with a fresh git fetch, that the clone may be discarded, so this takes a few seconds. A refusal is an answer, not an error
 * @param name the repo name
 * @returns the exact list of what would be lost with its fingerprint, or the reason the discard is refused
 * @example const preview = await getDiscardPreview('jozzo')
 */
export async function getDiscardPreview(name: string) {
  const response = await fetch(`/api/projects/${encodeURIComponent(name)}/discard`)
  return (await response.json().catch((): DiscardPreview => ({ ok: false, reason: `the server answered HTTP ${response.status}` }))) as DiscardPreview
}
