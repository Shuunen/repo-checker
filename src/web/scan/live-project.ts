import type { LiveResult } from '../../shared/scan-event.ts'

/** How often the open project is watched, in milliseconds. The server answers from a few git calls and no GitHub call while nothing changed, so a short delay costs almost nothing */
export const pollMs = 3000

/**
 * Ask the server whether a project changed since the last answer
 * @param name the project name
 * @param since the fingerprint of the last answer, empty the first time
 * @returns the answer, a refusal when the server could not be asked or did not answer with JSON
 * @example const answer = await getLive('finga', '')
 */
export async function getLive(name: string, since: string): Promise<LiveResult> {
  const response = await fetch(`/api/projects/${encodeURIComponent(name)}/live?since=${encodeURIComponent(since)}`).catch(() => undefined)
  if (response === undefined) return { ok: false, reason: 'the server could not be asked' }
  return response.json().catch((): LiveResult => ({ ok: false, reason: `the server answered HTTP ${response.status}` }))
}
