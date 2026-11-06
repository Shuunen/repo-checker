import { homedir } from 'node:os'
import type { ScanEvent } from '../shared/scan-event.ts'
import { errorMessage } from '../shared/text.ts'
import { homePath } from './home-path.ts'
import type { ScanHooks } from './scan.ts'
import { toScanProject } from './to-scan-project.ts'

/** Run a scan of the target the server was started on */
export type ScanRunner = (request: Readonly<ScanRequest>, hooks: Readonly<Required<ScanHooks>>) => Promise<{ isSingle: boolean; owner: string }>

/** What the page asks of a scan */
interface ScanRequest {
  /** The nitpick mode the page asks for, undefined to keep the current one */
  isNitpick: boolean | undefined
  /** Run git fetch first */
  shouldFetch: boolean
  /** Reuse the results the server remembers */
  shouldReuse: boolean
}

/** Send one scan event, after the ones sent before it */
type SendEvent = (event: Readonly<ScanEvent>) => Promise<void>

/**
 * Run a scan and send its events: progress lines and projects as they come, then done, or failed when the scan throws
 * @param runScan runs the scan
 * @param stream where the scan goes
 * @param stream.send sends one event
 * @param stream.shouldFetch run git fetch first
 * @param stream.shouldReuse reuse the results the server remembers
 * @param stream.isNitpick the nitpick mode the page asked for, undefined to keep the current one
 * @param stream.isNitpickNow tells if the nitpick rules run
 * @param stream.target the folder scanned
 */
export async function streamScan(runScan: ScanRunner, { isNitpick, isNitpickNow, send, shouldFetch, shouldReuse, target }: Readonly<{ isNitpick: boolean | undefined; isNitpickNow: () => boolean; send: SendEvent; shouldFetch: boolean; shouldReuse: boolean; target: string }>) {
  const started = Date.now()
  await send({ isNitpick: isNitpick ?? isNitpickNow(), target: homePath(target, homedir()), type: 'started' })
  try {
    const { isSingle, owner } = await runScan({ isNitpick, shouldFetch, shouldReuse }, { onProgress: line => send({ line, type: 'progress' }), onProject: result => send({ result: toScanProject(result), type: 'project' }) })
    await send({ durationMs: Date.now() - started, isSingle, owner, type: 'done' })
  } catch (error) {
    await send({ message: errorMessage(error), type: 'failed' })
  }
}
