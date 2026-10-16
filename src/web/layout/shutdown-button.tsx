import { Button } from '@heroui/react'
import { useState } from 'react'

/**
 * Stop the server, and with it the dashboard: asks the server to shut down then says Stopped, as the page cannot work without it
 * @returns the button
 */
export function ShutdownButton() {
  const [isStopped, setIsStopped] = useState(false)
  const shutdown = async () => {
    setIsStopped(true)
    await fetch('/api/shutdown', { headers: { 'x-repo-check': '1' }, method: 'POST' }).catch(() => undefined)
  }
  return (
    <Button data-testid="shutdown" isDisabled={isStopped} onPress={shutdown} variant="danger-soft">
      {isStopped ? 'Stopped' : 'Shutdown'}
    </Button>
  )
}
