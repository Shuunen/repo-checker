import { Button, Dropdown } from '@heroui/react'
import { HeaderItems } from './header-items.tsx'
import { useRestart } from './use-restart.ts'
import { useShutdown } from './use-shutdown.ts'

/**
 * What the trigger says: Actions, or why the page cannot work
 * @param isRestarting true while the server restarts
 * @param isStopped true once the server was asked to stop
 * @returns the label
 */
function triggerLabel(isRestarting: boolean, isStopped: boolean) {
  if (isRestarting) return 'Restarting…'
  return isStopped ? 'Stopped' : 'Actions'
}

/** What `HeaderMenu` shows and does */
interface HeaderMenuProps {
  /** True when the nitpick checks run */
  isNitpick: boolean
  /** True while the scan streams, Rescan waits for it */
  isScanning: boolean
  /** Starts a new scan with the nitpick mode switched */
  onNitpick: () => void
  onRescan: () => void
}

/**
 * The Actions menu of the app bar: Rescan, the Nitpick mode toggle and Restart, then Shutdown apart in its own section. Restart and Shutdown ask the server to start again or to stop, so the trigger says Restarting… or Stopped while the page cannot work
 * @param props the props
 * @returns the trigger and the menu
 */
export function HeaderMenu({ isNitpick, isScanning, onNitpick, onRescan }: Readonly<HeaderMenuProps>) {
  const { isRestarting, restart } = useRestart()
  const { isStopped, shutdown } = useShutdown()
  const handleChoice = (key: unknown) => {
    if (key === 'rescan') onRescan()
    else if (key === 'nitpick') onNitpick()
    else if (key === 'restart') void restart()
    else void shutdown()
  }
  return (
    <Dropdown>
      <Button data-testid="header-actions" isDisabled={isStopped || isRestarting} size="sm" variant="outline">
        {triggerLabel(isRestarting, isStopped)}
      </Button>
      <Dropdown.Popover className="border border-foreground/20 bg-surface-tertiary!" placement="bottom end">
        <Dropdown.Menu onAction={handleChoice}>
          <HeaderItems isNitpick={isNitpick} isScanning={isScanning} />
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
