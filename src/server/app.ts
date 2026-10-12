import { Hono, type MiddlewareHandler } from 'hono'
import { type SSEStreamingApi, streamSSE } from 'hono/streaming'
import type { ScanEvent, ScanProject } from '../shared/scan-event.ts'
import type { ProjectResult, ScanHooks } from './scan.ts'

/** The host names the server answers to, any other is refused so a web page on another domain cannot reach it through DNS rebinding */
const localHosts = new Set(['127.0.0.1', 'localhost'])

/** The HTTP status of a refused host */
const forbidden = 403

/** Run a scan of the target the server was started on */
export type ScanRunner = (shouldFetch: boolean, hooks: Readonly<Required<ScanHooks>>) => Promise<{ isSingle: boolean; owner: string }>

/** Send one scan event, after the ones sent before it */
type SendEvent = (event: Readonly<ScanEvent>) => Promise<void>

/**
 * Turn a project result into its JSON-safe shape: the edits of a fix are functions, only their files are kept
 * @param result the project result
 * @param result.findings the findings, with their edits
 * @param result.outcomes one outcome per rule
 * @param result.project the project
 * @returns the result as the page receives it
 */
export function toScanProject({ findings, outcomes, project }: Readonly<ProjectResult>): ScanProject {
  return { findings: findings.map(({ edits, ...finding }) => ({ ...finding, fixFiles: [...new Set(edits.map(edit => edit.file))] })), outcomes, project }
}

/**
 * Refuse any request whose host is not 127.0.0.1 or localhost
 * @param context the request context
 * @param next the next handler
 * @returns a 403 response for another host, nothing otherwise
 */
const refuseOtherHosts: MiddlewareHandler = async (context, next) => {
  if (!localHosts.has(new URL(context.req.url).hostname)) return context.text('repo-check only answers on 127.0.0.1 and localhost', forbidden)
  await next()
  return undefined
}

/**
 * Send events in order: progress and project events are sent from callbacks that do not wait, so each write waits for the previous one
 * @param stream the server-sent events stream
 * @returns the sender
 */
function eventSender(stream: Readonly<SSEStreamingApi>): SendEvent {
  let queue = Promise.resolve()
  return event => {
    queue = queue.then(() => stream.writeSSE({ data: JSON.stringify(event), event: event.type }))
    return queue
  }
}

/**
 * Run a scan and send its events: progress lines and projects as they come, then done, or failed when the scan throws
 * @param runScan runs the scan
 * @param shouldFetch run git fetch first
 * @param send sends one event
 */
async function streamScan(runScan: ScanRunner, shouldFetch: boolean, send: SendEvent) {
  const started = Date.now()
  try {
    const { isSingle, owner } = await runScan(shouldFetch, { onProgress: line => send({ line, type: 'progress' }), onProject: result => send({ result: toScanProject(result), type: 'project' }) })
    await send({ durationMs: Date.now() - started, isSingle, owner, type: 'done' })
  } catch (error) {
    await send({ message: error instanceof Error ? error.message : String(error), type: 'failed' })
  }
}

/**
 * Create the HTTP app: `GET /api/scan` streams the scan as server-sent events, see `ScanEvent`. `?fetch=false` skips git fetch
 * @param runScan runs a scan of the target
 * @returns the Hono app
 * @example serve({ fetch: createApp(runScan).fetch, hostname: '127.0.0.1' })
 */
export function createApp(runScan: ScanRunner) {
  return new Hono().use(refuseOtherHosts).get('/api/scan', context => streamSSE(context, stream => streamScan(runScan, context.req.query('fetch') !== 'false', eventSender(stream))))
}
