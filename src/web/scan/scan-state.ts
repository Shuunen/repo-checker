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
  /** How many projects the scan checks, known once the scan says `checking N projects` */
  total: number | undefined
}

/** The state before the first event */
export const initialScanState: ScanState = { done: undefined, failure: undefined, progress: '', projects: [], target: '', total: undefined }

/** The progress line that tells how many projects the scan checks */
const totalPattern = /^checking (?<count>\d+) projects?/u

/**
 * Read how many projects a progress line says the scan checks
 * @param line the progress line
 * @returns the count, undefined when the line says something else
 * @example readTotal('checking 59 projects') // 59
 */
export function readTotal(line: string) {
  const count = totalPattern.exec(line)?.groups?.count
  return count === undefined ? undefined : Number(count)
}

/**
 * Apply one scan event to the state
 * @param state the state so far
 * @param event the event
 * @returns the new state
 */
export function reduceScan(state: Readonly<ScanState>, event: Readonly<ScanEvent>): ScanState {
  if (event.type === 'started') return { ...state, target: event.target }
  if (event.type === 'progress') return { ...state, progress: event.line, total: readTotal(event.line) ?? state.total }
  if (event.type === 'project') return { ...state, projects: [...state.projects, event.result] }
  if (event.type === 'failed') return { ...state, failure: event.message }
  return { ...state, done: event }
}

/** Milliseconds in a second */
const second = 1000

/**
 * Describe the progress of a running scan: how many projects are checked out of the total once known, otherwise the last progress line
 * @param state the scan state
 * @returns the progress, like `checking 34 of 59 projects…`
 */
function describeProgress(state: Readonly<ScanState>) {
  return state.total === undefined ? state.progress : `checking ${state.projects.length} of ${state.total} projects…`
}

/**
 * Describe the scan in one line: the target and the owner, then the progress while it runs or its duration once done
 * @param state the scan state
 * @param isScanning true while the stream is open
 * @returns the line, like `~/Projects · Shuunen · scanned in 8.3s`
 */
export function describeScan(state: Readonly<ScanState>, isScanning: boolean) {
  const status = isScanning ? describeProgress(state) : state.done && `scanned in ${(state.done.durationMs / second).toFixed(1)}s`
  return [state.target, state.done?.owner, status].filter(part => part !== undefined && part !== '').join(' · ')
}

/**
 * Put a project, scanned again after an action, in place of its old entry, or remove it when it is gone. A project the scan did not have yet is added
 * @param state the scan state
 * @param name the project name
 * @param project the project as it is now, undefined when it is gone
 * @returns the new state, the other projects untouched
 * @example replaceProject(state, 'finga', rescanned)
 */
export function replaceProject(state: Readonly<ScanState>, name: string, project: ScanProject | undefined): ScanState {
  const others = state.projects.filter(item => item.project.name !== name)
  if (project === undefined) return { ...state, projects: others }
  const index = state.projects.findIndex(item => item.project.name === name)
  return { ...state, projects: index === -1 ? [...others, project] : state.projects.map(item => (item.project.name === name ? project : item)) }
}
