import { useState } from 'react'

/**
 * Stop the server, and with it the dashboard: asks the server to shut down and remembers it, as the page cannot work without it
 * @returns whether the server was asked to stop, and the function that asks
 * @example const { isStopped, shutdown } = useShutdown()
 */
export function useShutdown() {
  const [isStopped, setIsStopped] = useState(false)
  const shutdown = async () => {
    setIsStopped(true)
    await fetch('/api/shutdown', { headers: { 'x-repo-check': '1' }, method: 'POST' }).catch(() => undefined)
  }
  return { isStopped, shutdown }
}
