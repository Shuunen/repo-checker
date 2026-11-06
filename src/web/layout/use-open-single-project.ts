import { useEffect, useRef } from 'react'
import { useLocation } from 'wouter'
import { projectHref } from '../projects/rows.ts'
import type { ScanState } from '../scan/scan-state.ts'

/**
 * Open the project view when the scan is of a single project, only once so the back link still works
 * @param state the scan state
 * @param state.done set when the scan is over
 * @param state.projects the projects checked so far
 */
export function useOpenSingleProject({ done, projects }: Readonly<ScanState>) {
  const [location, navigate] = useLocation()
  const hasOpened = useRef(false)
  const name = projects[0]?.project.name
  useEffect(() => {
    if (hasOpened.current || done?.isSingle !== true || name === undefined || location !== '/') return
    hasOpened.current = true
    navigate(projectHref(name), { replace: true })
  }, [done, location, name, navigate])
}
