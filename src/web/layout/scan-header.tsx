import { Button, Spinner } from '@heroui/react'
import { describeScan, type ScanState } from '../scan/scan-state.ts'

/**
 * The page header: the filter title, a line about the scan (a spinner and the progress while it runs, then the owner and the duration), and the Rescan button
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
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="flex items-center gap-2 text-sm text-muted" data-testid="scan-line">
          {isScanning && <Spinner size="sm" />}
          {describeScan(state, isScanning)}
        </p>
      </div>
      <Button data-testid="rescan" isDisabled={isScanning} onPress={onRescan}>
        Rescan
      </Button>
    </header>
  )
}
