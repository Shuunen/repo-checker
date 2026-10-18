import { Dropdown } from '@heroui/react'
import { Eye, EyeOff, Power, RefreshCw, ScanSearch } from 'lucide-react'

/** The look of an item of the menu, the same as the menu of a row */
const itemClass = 'data-[focused=true]:bg-background/50! data-[hovered=true]:bg-background/50!'

/**
 * The items of the Actions menu of the app bar: Rescan and Restart, then Shutdown apart in its own section
 * @param props the props
 * @param props.isNitpick true when the nitpick checks run
 * @param props.isScanning true while the scan streams, Rescan and the toggle wait for it
 * @returns the sections
 */
export function HeaderItems({ isNitpick, isScanning }: Readonly<{ isNitpick: boolean; isScanning: boolean }>) {
  return (
    <>
      <Dropdown.Section>
        <Dropdown.Item className={itemClass} data-testid="menu-rescan" id="rescan" isDisabled={isScanning} textValue="Rescan">
          <ScanSearch aria-hidden="true" size={16} />
          Rescan
        </Dropdown.Item>
        <Dropdown.Item className={itemClass} data-testid="menu-nitpick" id="nitpick" isDisabled={isScanning} textValue="Nitpick mode">
          {isNitpick ? <Eye aria-hidden="true" size={16} /> : <EyeOff aria-hidden="true" size={16} />}
          Nitpick mode: {isNitpick ? 'on' : 'off'}
        </Dropdown.Item>
        <Dropdown.Item className={itemClass} data-testid="menu-restart" id="restart" textValue="Restart">
          <RefreshCw aria-hidden="true" size={16} />
          Restart
        </Dropdown.Item>
      </Dropdown.Section>
      <Dropdown.Section className="mt-1 border-t border-foreground/20 pt-1">
        <Dropdown.Item className={itemClass} data-testid="menu-shutdown" id="shutdown" textValue="Shutdown" variant="danger">
          <Power aria-hidden="true" size={16} />
          Shutdown
        </Dropdown.Item>
      </Dropdown.Section>
    </>
  )
}
