import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocation } from 'wouter'
import { projectQuery } from '../scan/project-query.ts'
import { type FetchScan, scanQuery } from '../scan/scan-query.ts'
import { initialScanState } from '../scan/scan-state.ts'

/**
 * Read the project name from an address
 * @param location the address
 * @returns the name, undefined when the address is not a project
 * @example readProjectName('/project/finga') // 'finga'
 */
function readProjectName(location: string) {
  const name = /^\/project\/(?<name>[^/]+)/u.exec(location)?.groups?.name
  return name === undefined ? undefined : decodeURIComponent(name)
}

/**
 * The scan for the current address. On a project address only that project is scanned, so a reload is fast, and the scan of every project starts once the list is opened. When the project cannot be scanned alone the scan of every project runs
 * @param request starts the scan request
 * @returns the scan query, the state to show and whether something is scanning
 * @example const { isScanning, query, state } = useScan(request)
 */
export function useScan(request: FetchScan | undefined) {
  const name = readProjectName(useLocation()[0])
  const [isListed, setIsListed] = useState(name === undefined)
  if (name === undefined && !isListed) setIsListed(true)
  const single = useQuery(projectQuery(name ?? '', !isListed))
  const query = useQuery({ ...scanQuery(request), enabled: isListed || single.isError })
  const alone = single.data?.project === undefined ? initialScanState : { ...initialScanState, projects: [single.data.project], target: single.data.target }
  return { isScanning: query.isFetching || single.isFetching, query, state: query.data ?? alone }
}
