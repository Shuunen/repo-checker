import { serveStatic } from '@hono/node-server/serve-static'
import { Hono, type MiddlewareHandler } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { ScanEvent } from '../shared/scan-event.ts'
import type { Actions } from './actions/actions-contract.ts'
import { actionRoutes } from './app-actions.ts'
import { eventSender } from './sse.ts'
import { type ScanRunner, streamScan } from './stream-scan.ts'

export type { ScanRunner } from './stream-scan.ts'

/** The host names the server answers to, any other is refused so a web page on another domain cannot reach it through DNS rebinding */
const localHosts = new Set(['127.0.0.1', 'localhost'])

/** The HTTP status of a refused host or request */
const forbidden = 403

/** The header every request that changes something must carry, a web page on another site cannot add it without the server's consent */
const actionHeader = 'x-repo-check'

/** Where the server runs */
interface AppOptions {
  /** The actions the page can ask for */
  actions: Actions
  /** Tell if the nitpick rules run now, sent to the page so its toggle shows it */
  isNitpick: () => boolean
  /** Stops this server and starts a new one in its place, called once the restart request is answered */
  restart: () => void
  /** Stops the server and everything started with it, called once the shutdown request is answered */
  shutdown: () => void
  /** The folder scanned, sent first so the page can show it while the scan runs, with the home folder as `~` */
  target: string
  /** The built web app, served on every path that is not an API route */
  webFolder: string
}

/** How long the server waits before it stops or restarts, in milliseconds, so the answer to the shutdown or restart request reaches the page */
const shutdownDelay = 100

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
 * Read the nitpick mode a page asks for
 * @param value the `nitpick` query parameter
 * @returns true or false when the page says so, undefined to keep the current mode
 */
function nitpickOf(value: string | undefined) {
  if (value === undefined) return undefined
  return value === 'true'
}

/**
 * Create the HTTP app: `GET /api/scan` streams the scan as server-sent events, see `ScanEvent`, `?fetch=false` skips git fetch and `?fresh=true` checks every project even when the server remembers its result, `?nitpick=true` or `false` sets the nitpick mode, otherwise it stays as it is. `GET /api/projects/:name/live?since=` watches a project, see `liveProject`. `POST /api/shutdown` answers then stops the server, `POST /api/restart` answers then replaces it with a new one. `POST /api/projects/:name/clone` clones a repo, `GET /api/projects/:name/delete-clone` says what deleting its clone would remove and `POST` deletes it, `POST /api/projects/:name/unarchive-push` pushes the unsaved branches of an archived repo through an unarchive, `GET /api/projects/:name/discard` lists what a discard would throw away with a fingerprint of that list, and `POST` discards it only when `?fingerprint=` still matches. A POST needs the `x-repo-check: 1` header, and every action answers its result as JSON, with status 409 when refused. Every other path serves the built web app, and `/project/*` serves its page too, so a reload on a project address works
 * @param runScan runs a scan of the target
 * @param options where the server runs
 * @param options.actions the actions the page can ask for
 * @param options.isNitpick tells if the nitpick rules run
 * @param options.restart stops this server and starts a new one
 * @param options.shutdown stops the server
 * @param options.target the folder scanned
 * @param options.webFolder the built web app
 * @returns the Hono app
 * @example serve({ fetch: createApp(runScan, { actions, isNitpick, restart, shutdown, target, webFolder }).fetch, hostname: '127.0.0.1' })
 */
export function createApp(runScan: ScanRunner, { actions, isNitpick, restart, shutdown, target, webFolder }: Readonly<AppOptions>) {
  return new Hono()
    .use(refuseOtherHosts)
    .use(requireActionHeader)
    .route('/', actionRoutes(actions))
    .post('/api/shutdown', context => {
      setTimeout(shutdown, shutdownDelay)
      return context.json({ ok: true })
    })
    .post('/api/restart', context => {
      setTimeout(restart, shutdownDelay)
      return context.json({ ok: true })
    })
    .get('/api/scan', context =>
      streamSSE(context, stream => streamScan(runScan, { isNitpick: nitpickOf(context.req.query('nitpick')), isNitpickNow: isNitpick, send: eventSender<ScanEvent>(stream), shouldFetch: context.req.query('fetch') !== 'false', shouldReuse: context.req.query('fresh') !== 'true', target })),
    )
    .use(serveStatic({ root: webFolder }))
    .get('/project/*', serveStatic({ path: 'index.html', root: webFolder }))
}
