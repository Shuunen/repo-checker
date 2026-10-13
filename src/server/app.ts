import { serveStatic } from '@hono/node-server/serve-static'
import { Hono, type MiddlewareHandler } from 'hono'
import { type SSEStreamingApi, streamSSE } from 'hono/streaming'
import type { ScanEvent, ScanProject } from '../shared/scan-event.ts'
import type { Actions } from './actions/actions.ts'
import type { ProjectResult } from './check-projects.ts'
import type { ScanHooks } from './scan.ts'

/** The host names the server answers to, any other is refused so a web page on another domain cannot reach it through DNS rebinding */
const localHosts = new Set(['127.0.0.1', 'localhost'])

/** The HTTP status of a refused host or request */
const forbidden = 403

/** The HTTP status of an action that worked */
const succeeded = 200

/** The HTTP status of an action that was refused or failed */
const conflict = 409

/** The header every request that changes something must carry, a web page on another site cannot add it without the server's consent */
const actionHeader = 'x-repo-check'

/** Run a scan of the target the server was started on */
export type ScanRunner = (shouldFetch: boolean, hooks: Readonly<Required<ScanHooks>>) => Promise<{ isSingle: boolean; owner: string }>

/** Where the server runs */
interface AppOptions {
  /** The actions the page can ask for */
  actions: Actions
  /** The folder scanned, sent first so the page can show it while the scan runs */
  target: string
  /** The built web app, served on every path that is not an API route */
  webFolder: string
}

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
 * Refuse any request that changes something unless it carries the action header. A web page of another site can post to 127.0.0.1 but cannot add a custom header without a preflight the server never answers
 * @param context the request context
 * @param next the next handler
 * @returns a 403 response for a request without the header, nothing otherwise
 */
const requireActionHeader: MiddlewareHandler = async (context, next) => {
  if (context.req.method !== 'GET' && context.req.header(actionHeader) !== '1') return context.text(`a request that changes something needs the ${actionHeader} header`, forbidden)
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
 * @param stream where the scan goes
 * @param stream.send sends one event
 * @param stream.shouldFetch run git fetch first
 * @param stream.target the folder scanned
 */
async function streamScan(runScan: ScanRunner, { send, shouldFetch, target }: Readonly<{ send: SendEvent; shouldFetch: boolean; target: string }>) {
  const started = Date.now()
  await send({ target, type: 'started' })
  try {
    const { isSingle, owner } = await runScan(shouldFetch, { onProgress: line => send({ line, type: 'progress' }), onProject: result => send({ result: toScanProject(result), type: 'project' }) })
    await send({ durationMs: Date.now() - started, isSingle, owner, type: 'done' })
  } catch (error) {
    await send({ message: error instanceof Error ? error.message : String(error), type: 'failed' })
  }
}

/**
 * Create the HTTP app: `GET /api/scan` streams the scan as server-sent events, see `ScanEvent`, `?fetch=false` skips git fetch. `POST /api/projects/:name/clone` clones a repo, `GET /api/projects/:name/delete-clone` says what deleting its clone would remove and `POST` deletes it, `POST /api/projects/:name/unarchive-push` pushes the unsaved branches of an archived repo through an unarchive. A POST needs the `x-repo-check: 1` header, and every action answers its result as JSON, with status 409 when refused. Every other path serves the built web app, and `/project/*` serves its page too, so a reload on a project address works
 * @param runScan runs a scan of the target
 * @param options where the server runs
 * @param options.actions the actions the page can ask for
 * @param options.target the folder scanned
 * @param options.webFolder the built web app
 * @returns the Hono app
 * @example serve({ fetch: createApp(runScan, { actions, target, webFolder }).fetch, hostname: '127.0.0.1' })
 */
export function createApp(runScan: ScanRunner, { actions, target, webFolder }: Readonly<AppOptions>) {
  return new Hono()
    .use(refuseOtherHosts)
    .use(requireActionHeader)
    .post('/api/projects/:name/clone', async context => {
      const result = await actions.clone(context.req.param('name'))
      return context.json(result, result.ok ? succeeded : conflict)
    })
    .post('/api/projects/:name/unarchive-push', async context => {
      const result = await actions.unarchivePush(context.req.param('name'))
      return context.json(result, result.ok ? succeeded : conflict)
    })
    .get('/api/projects/:name/delete-clone', async context => {
      const result = await actions.previewDeleteClone(context.req.param('name'))
      return context.json(result, result.ok ? succeeded : conflict)
    })
    .post('/api/projects/:name/delete-clone', async context => {
      const result = await actions.deleteClone(context.req.param('name'))
      return context.json(result, result.ok ? succeeded : conflict)
    })
    .get('/api/scan', context => streamSSE(context, stream => streamScan(runScan, { send: eventSender(stream), shouldFetch: context.req.query('fetch') !== 'false', target })))
    .use(serveStatic({ root: webFolder }))
    .get('/project/*', serveStatic({ path: 'index.html', root: webFolder }))
}
