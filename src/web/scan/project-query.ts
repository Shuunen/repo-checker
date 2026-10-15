import { queryOptions } from '@tanstack/react-query'
import type { RescanResult, ScanProject } from '../../shared/scan-event.ts'

/** One project scanned alone, with the folder it lives in */
export interface SingleProject {
  /** The project as it is now, undefined when the scan has no such project */
  project: ScanProject | undefined
  /** The folder of projects */
  target: string
}

/**
 * The cache key of one project scanned alone
 * @param name the project name
 * @returns the key
 */
export const projectQueryKey = (name: string) => ['project', name]

/**
 * Ask the server for one project as it is now
 * @param name the project name
 * @returns the answer, a refusal when the server could not be asked or did not answer with JSON
 */
export async function getRescan(name: string): Promise<RescanResult> {
  const response = await fetch(`/api/projects/${encodeURIComponent(name)}/rescan`)
  return response.json().catch((): RescanResult => ({ ok: false, reason: `the server answered HTTP ${response.status}` }))
}

/**
 * One project as a query, so a reload on the project page does not wait for the scan of every project
 * @param name the project name
 * @param isEnabled false to not scan the project
 * @returns the query options
 * @example const { data } = useQuery(projectQuery('finga', true))
 */
export function projectQuery(name: string, isEnabled: boolean) {
  return queryOptions({
    enabled: isEnabled,
    queryFn: async (): Promise<SingleProject> => {
      const answer = await getRescan(name)
      if (!answer.ok) throw new Error(answer.reason)
      return { project: answer.project, target: answer.target }
    },
    queryKey: projectQueryKey(name),
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
}
