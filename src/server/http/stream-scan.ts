import { homedir } from 'node:os'
import { Result } from 'shuutils'
import type { ScanEvent } from '../../shared/scan-event.ts'
import { errorMessage } from '../../shared/text.ts'
import { homePath } from '../inventory/home-path.ts'
import { type IgnoredRules, neverIgnored } from '../inventory/ignored-rules.ts'
import type { ScanHooks } from '../inventory/scan.ts'
import { toScanProject } from '../inventory/to-scan-project.ts'

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
 * @param stream.ignored the rules the user ignored, left out of the projects
 * @param stream.isNitpick the nitpick mode the page asked for, undefined to keep the current one
 * @param stream.isNitpickNow tells if the nitpick rules run
 * @param stream.target the folder scanned
 */
export async function streamScan(
  runScan: ScanRunner,
  { ignored = neverIgnored, isNitpick, isNitpickNow, send, shouldFetch, shouldReuse, target }: Readonly<{ ignored?: IgnoredRules | undefined; isNitpick: boolean | undefined; isNitpickNow: () => boolean; send: SendEvent; shouldFetch: boolean; shouldReuse: boolean; target: string }>,
) {
  const started = Date.now()
  await send({ isNitpick: isNitpick ?? isNitpickNow(), target: homePath(target, homedir()), type: 'started' })
  const scan = await Result.trySafe(runScan({ isNitpick, shouldFetch, shouldReuse }, { onProgress: line => void send({ line, type: 'progress' }), onProject: result => void send({ result: toScanProject(result, ignored), type: 'project' }) }))
  await send(scan.ok ? { durationMs: Date.now() - started, isSingle: scan.value.isSingle, owner: scan.value.owner, type: 'done' } : { message: errorMessage(scan.error), type: 'failed' })
}
