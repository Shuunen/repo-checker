import { Spinner } from '@heroui/react'
import { describeScan, type ScanState } from '../scan/scan-state.ts'

/**
 * The page title and, under it, a line about the scan: a spinner and the progress while it runs, then the owner and the duration
 * @param props the props
 * @param props.isScanning true while the scan streams
 * @param props.state the scan state
 * @param props.title the selected filter label
 * @returns the title block
 */
export function ScanTitle({ isScanning, state, title }: Readonly<{ isScanning: boolean; state: ScanState; title: string }>) {
  return (
    <div>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="flex items-center gap-2 text-sm text-muted" data-testid="scan-line">
        {isScanning && <Spinner size="sm" />}
        {describeScan(state, isScanning)}
      </p>
    </div>
  )
}
