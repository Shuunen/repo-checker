import type { ScanEvent, ScanProject } from '../../shared/scan-event.ts'

/** The end of a scan */
type ScanDone = Extract<ScanEvent, { type: 'done' }>

/** What the page knows about the current scan, built event by event */
export interface ScanState {
  /** Set when the scan is over */
  done: ScanDone | undefined
  /** The error message when the scan stopped */
  failure: string | undefined
  /** The last progress line */
  progress: string
  /** The projects checked so far, in the order they came */
  projects: ScanProject[]
  /** The folder scanned, empty until the scan starts */
  target: string
}

/** The state before the first event */
export const initialScanState: ScanState = { done: undefined, failure: undefined, progress: '', projects: [], target: '' }

/**
 * Apply one scan event to the state
 * @param state the state so far
 * @param event the event
 * @returns the new state
 */
export function reduceScan(state: Readonly<ScanState>, event: Readonly<ScanEvent>): ScanState {
  if (event.type === 'started') return { ...state, target: event.target }
  if (event.type === 'progress') return { ...state, progress: event.line }
  if (event.type === 'project') return { ...state, projects: [...state.projects, event.result] }
  if (event.type === 'failed') return { ...state, failure: event.message }
  return { ...state, done: event }
}

/** Milliseconds in a second */
const second = 1000

/**
 * Describe the scan in one line: the target and the owner, then the progress while it runs or its duration once done
 * @param state the scan state
 * @param isScanning true while the stream is open
 * @returns the line, like `~/Projects · Shuunen · scanned in 8.3s`
 */
export function describeScan(state: Readonly<ScanState>, isScanning: boolean) {
  const status = isScanning ? state.progress : state.done && `scanned in ${(state.done.durationMs / second).toFixed(1)}s`
  return [state.target, state.done?.owner, status].filter(part => part !== undefined && part !== '').join(' · ')
}
