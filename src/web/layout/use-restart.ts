import { useState } from 'react'

/** How long to wait between two looks at the server, in milliseconds, the first one lets the old server stop */
const pollDelay = 500

/**
 * Wait for the server to answer again
 * @returns resolves once it does
 */
async function waitForServer(): Promise<void> {
  await new Promise<void>(resolve => {
    setTimeout(resolve, pollDelay)
  })
  const isUp = await fetch('/').then(
    response => response.ok,
    () => false,
  )
  if (!isUp) await waitForServer()
}

/**
 * Restart the server: asks it to replace itself with a new one, waits until the new one answers then reloads the page
 * @returns whether a restart is under way, and the function that asks for it
 * @example const { isRestarting, restart } = useRestart()
 */
export function useRestart() {
  const [isRestarting, setIsRestarting] = useState(false)
  const restart = async () => {
    setIsRestarting(true)
    await fetch('/api/restart', { headers: { 'x-repo-check': '1' }, method: 'POST' }).catch(() => undefined)
    await waitForServer()
    globalThis.location.reload()
  }
  return { isRestarting, restart }
}
