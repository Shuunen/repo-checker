import type { QueryClient } from '@tanstack/react-query'
import type { RescanResult } from '../../shared/scan-event.ts'
import { getRescan, projectQueryKey, type SingleProject } from './project-query.ts'
import { scanQueryKey } from './scan-query.ts'
import { replaceProject, type ScanState } from './scan-state.ts'

/**
 * Show what an action changed: the project is scanned again on the server and put in place of its old entry in the scan, so the rest of the list stays and nothing is scanned twice. When the project cannot be scanned alone the whole scan runs again
 * @param client the query client that holds the scan
 * @param name the project name
 * @returns nothing when the project was replaced, or the full scan that runs again when it could not be scanned alone
 * @example await refreshProject(client, 'finga')
 */
export async function refreshProject(client: QueryClient, name: string) {
  const answer = await getRescan(name).catch((): RescanResult => ({ ok: false, reason: 'the server could not be asked' }))
  if (!answer.ok) return Promise.all([client.invalidateQueries({ queryKey: scanQueryKey }), client.invalidateQueries({ queryKey: projectQueryKey(name) })])
  client.setQueryData<SingleProject>(projectQueryKey(name), { project: answer.project, target: answer.target })
  client.setQueryData<ScanState>(scanQueryKey, state => state && replaceProject(state, name, answer.project))
  return undefined
}
