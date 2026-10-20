import { ProgressBar } from '@heroui/react'
import type { ScanState } from '../scan/scan-state.ts'

/** What `ScanProgress` shows and does */
interface ScanProgressProps {
  /** The scan state */
  state: ScanState
}

/**
 * A thin progress bar under the header while the scan runs: the projects checked out of the total, or an indeterminate bar until the total is known
 * @param props the props
 * @returns the bar
 */
export function ScanProgress({ state }: Readonly<ScanProgressProps>) {
  return (
    <ProgressBar aria-label="Scan progress" data-testid="scan-progress" isIndeterminate={state.total === undefined} maxValue={state.total ?? 1} size="sm" value={state.projects.length}>
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  )
}
