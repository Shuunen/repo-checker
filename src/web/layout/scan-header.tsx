import { Button } from '@heroui/react'
import type { ScanState } from '../scan/scan-state.ts'
import { ScanTitle } from './scan-title.tsx'

/**
 * The page header: the filter title, a line about the scan, and the Rescan button
 * @param props the props
 * @param props.isScanning true while the scan streams
 * @param props.onRescan starts a new scan
 * @param props.state the scan state
 * @param props.title the selected filter label
 * @returns the header
 */
export function ScanHeader({ isScanning, onRescan, state, title }: Readonly<{ isScanning: boolean; onRescan: () => void; state: ScanState; title: string }>) {
  return (
    <header className="flex items-start justify-between gap-4">
      <ScanTitle isScanning={isScanning} state={state} title={title} />
      <Button data-testid="rescan" isDisabled={isScanning} onPress={onRescan}>
        Rescan
      </Button>
    </header>
  )
}
