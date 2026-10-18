import { Button } from '@heroui/react'
import { Link } from 'wouter'
import { describeScan, type ScanState } from '../scan/scan-state.ts'
import { CopyPathIcon } from './copy-path-icon.tsx'
import { ScanProgress } from './scan-progress.tsx'
import { ShutdownButton } from './shutdown-button.tsx'

/**
 * The app bar on top of every page: the app name linking to the list, the line about the scan (folder, owner, checked count or duration), a copy icon next to it, the Rescan and Shutdown buttons, and the progress bar under it while the scan runs
 * @param props the props
 * @param props.isScanning true while the scan streams
 * @param props.onRescan starts a new scan
 * @param props.state the scan state
 * @returns the bar
 */
export function AppBar({ isScanning, onRescan, state }: Readonly<{ isScanning: boolean; onRescan: () => void; state: ScanState }>) {
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
        <Button className="bg-zinc-800 text-white hover:bg-zinc-700" data-testid="rescan" isDisabled={isScanning} onPress={onRescan}>
          Rescan
        </Button>
        <ShutdownButton />
      </div>
      {isScanning && <ScanProgress state={state} />}
    </header>
  )
}
