import { Link } from 'wouter'
import { describeScan, type ScanState } from '../scan/scan-state.ts'
import { CopyPathIcon } from './copy-path-icon.tsx'
import { HeaderMenu } from './header-menu.tsx'
import { ScanProgress } from './scan-progress.tsx'

/**
 * The app bar on top of every page: the app name linking to the list, the line about the scan (folder, owner, checked count or duration), a copy icon next to it, the Actions menu with Rescan and Shutdown, and the progress bar under it while the scan runs
 * @param props the props
 * @param props.isScanning true while the scan streams
 * @param props.onNitpick starts a new scan with the nitpick mode switched
 * @param props.onRescan starts a new scan
 * @param props.state the scan state
 * @returns the bar
 */
export function AppBar({ isScanning, onNitpick, onRescan, state }: Readonly<{ isScanning: boolean; onNitpick: () => void; onRescan: () => void; state: ScanState }>) {
  return (
    <header className="flex flex-col">
      <div className="flex items-center gap-4 border-b border-separator px-8 py-3">
        <Link className="flex items-center gap-2 font-semibold" data-testid="brand" href="/">
          <span className="size-4 rounded bg-accent" />
          repo-checker
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <p className="min-w-0 truncate text-sm text-muted" data-testid="scan-line">
            {describeScan(state, isScanning)}
          </p>
          <CopyPathIcon path={state.target} testId="copy-scan-path" />
        </div>
        <HeaderMenu isNitpick={state.isNitpick} isScanning={isScanning} onNitpick={onNitpick} onRescan={onRescan} />
      </div>
      {isScanning && <ScanProgress state={state} />}
    </header>
  )
}
