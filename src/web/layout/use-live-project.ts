import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { LiveResult, RemoteState } from '../../shared/scan-event.ts'
import { getLive, pollMs } from '../scan/live-project.ts'
import { putProject } from '../scan/refresh-project.ts'

/** What the page knows about its watch of the project */
interface LiveStatus {
  /** When the server last answered, in milliseconds, undefined before the first answer */
  checkedAt: number | undefined
  /** Whether GitHub's side is read on time or paused by a low rate limit */
  remote: RemoteState
}

/** The state of one watch, kept apart from React so a tick that ends after the page was left can see it */
interface Watch {
  /** True once the page left the project */
  isStopped: boolean
  /** The fingerprint of the last answer, empty before it */
  since: string
  /** The timer of the next tick */
  timer: ReturnType<typeof setTimeout> | undefined
}

/** A dialog of a fix or an action, while one is open the project is not replaced under it */
const openDialog = '[role="dialog"], [role="alertdialog"]'

/**
 * Ask the server about the project, unless the tab is hidden or a dialog is open
 * @param name the project name
 * @param since the fingerprint of the last answer
 * @returns the answer, undefined when nothing was asked or the server refused
 */
async function askOnce(name: string, since: string): Promise<Extract<LiveResult, { ok: true }> | undefined> {
  if (document.hidden || document.querySelector(openDialog) !== null) return undefined
  const answer = await getLive(name, since)
  return answer.ok ? answer : undefined
}

/**
 * Watch the open project: every few seconds the server is asked whether the clone changed, and the project is replaced in place when it did. Nothing is asked while the tab is hidden or a dialog is open, so a preview is never swapped under the user
 * @param name the project name
 * @param isEnabled false to not watch, for example while a scan runs
 * @returns when the server last answered and the state of the GitHub side
 * @example const { checkedAt, remote } = useLiveProject('finga', true)
 */
export function useLiveProject(name: string, isEnabled: boolean): LiveStatus {
  const client = useQueryClient()
  const [status, setStatus] = useState<LiveStatus>({ checkedAt: undefined, remote: 'fresh' })
  useEffect(() => {
    if (!isEnabled) return undefined
    const watch: Watch = { isStopped: false, since: '', timer: undefined }
    const apply = (answer: Extract<LiveResult, { ok: true }>, queryClient: QueryClient) => {
      watch.since = answer.fingerprint
      if (answer.changed) putProject(queryClient, name, { project: answer.project, target: answer.target })
      setStatus({ checkedAt: Date.now(), remote: answer.remote })
    }
    const tick = async () => {
      const answer = await askOnce(name, watch.since)
      if (answer !== undefined && !watch.isStopped) apply(answer, client)
      if (!watch.isStopped) watch.timer = setTimeout(() => void tick(), pollMs)
    }
    watch.timer = setTimeout(() => void tick(), pollMs)
    return () => {
      watch.isStopped = true
      clearTimeout(watch.timer)
    }
  }, [client, isEnabled, name])
  return status
}
