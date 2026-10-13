import type { QueryClient } from '@tanstack/react-query'
import type { RescanResult } from '../../shared/scan-event.ts'
import { scanQueryKey } from './scan-query.ts'
import { replaceProject, type ScanState } from './scan-state.ts'

/**
 * Ask the server for one project as it is now, after an action changed it
 * @param name the project name
 * @returns the answer, a refusal when the server could not be asked or did not answer with JSON
 */
async function getRescan(name: string): Promise<RescanResult> {
  const response = await fetch(`/api/projects/${encodeURIComponent(name)}/rescan`)
  return response.json().catch((): RescanResult => ({ ok: false, reason: `the server answered HTTP ${response.status}` }))
}

/**
 * Show what an action changed: the project is scanned again on the server and put in place of its old entry in the scan, so the rest of the list stays and nothing is scanned twice. When the project cannot be scanned alone the whole scan runs again
 * @param client the query client that holds the scan
 * @param name the project name
 * @returns nothing when the project was replaced, or the full scan that runs again when it could not be scanned alone
 * @example await refreshProject(client, 'finga')
 */
export async function refreshProject(client: QueryClient, name: string) {
  const answer = await getRescan(name).catch((): RescanResult => ({ ok: false, reason: 'the server could not be asked' }))
  if (!answer.ok) return client.invalidateQueries({ queryKey: scanQueryKey })
  client.setQueryData<ScanState>(scanQueryKey, state => state && replaceProject(state, name, answer.project))
  return undefined
}
