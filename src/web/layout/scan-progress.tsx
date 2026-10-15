import { ProgressBar } from '@heroui/react'
import type { ScanState } from '../scan/scan-state.ts'

/**
 * A thin progress bar under the header while the scan runs: the projects checked out of the total, or an indeterminate bar until the total is known
 * @param props the props
 * @param props.state the scan state
 * @returns the bar
 */
export function ScanProgress({ state }: Readonly<{ state: ScanState }>) {
  return (
    <ProgressBar aria-label="Scan progress" data-testid="scan-progress" isIndeterminate={state.total === undefined} maxValue={state.total ?? 1} size="sm" value={state.projects.length}>
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  )
}
