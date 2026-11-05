import { type Context, Hono, type MiddlewareHandler } from 'hono'
import { streamSSE } from 'hono/streaming'
import { type ActionResult, type FingerprintedAction, type FixStage, type MetadataValues, type PostedAction, type PreviewedAction, refused } from '../shared/action.ts'
import type { ChatEvent } from '../shared/claude.ts'
import type { Actions } from './actions/actions-contract.ts'
import { isRepoName } from './actions/guards.ts'
import { eventSender } from './sse.ts'

/** The HTTP status of an action that worked */
const succeeded = 200

/** The HTTP status of an action that was refused or failed */
const conflict = 409

/**
 * Answer an action result as JSON: 200 when it worked, 409 with the reason when it was refused or failed
 * @param context the request context
 * @param result what the action gave, `ok` tells if it worked
 * @param result.ok true when the action worked
 * @returns the JSON response
 */
function reply(context: Context, result: Readonly<{ ok: boolean; reason?: string }>) {
  return context.json(result, result.ok ? succeeded : conflict)
}

/**
 * Answer an action as a stream of JSON lines: a `{ stage }` line each time it enters a step, then a `{ result }` line, so the page can say what is going on while it runs. The HTTP status is always 200, `result.ok` tells if it worked
 * @param run the action, given what to call when it enters a step
 * @returns the streamed response
 */
function stream(run: (onStage: (stage: FixStage) => void) => Promise<ActionResult>) {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (line: object) => controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`))
      send({ result: await run(stage => send({ stage })) })
      controller.close()
    },
  })
  return new Response(body, { headers: { 'content-type': 'application/x-ndjson' } })
}

/**
 * The routes of the update with Claude: start the session, follow it as server-sent events, send it a message, close it
 * @param actions the actions
 * @returns the routes
 */
function updateRoutes(actions: Actions) {
  return new Hono()
    .post('/api/projects/:name/update-project', async context => reply(context, await actions.startUpdateProject(context.req.param('name'))))
    .get('/api/projects/:name/update-project/events', context =>
      streamSSE(context, async sse => {
        const ended = Promise.withResolvers<undefined>()
        const write = eventSender<ChatEvent>(sse)
        const send = (event: ChatEvent) => {
          const written = write(event)
          if (event.type === 'exit') void written.then(() => ended.resolve(undefined))
        }
        const unwatch = actions.watchUpdateProject(context.req.param('name'), send)
        if (unwatch === undefined) send({ message: 'there is no Claude session for this project', type: 'exit' })
        sse.onAbort(() => ended.resolve(undefined))
        await ended.promise
        unwatch?.()
      }),
    )
    .post('/api/projects/:name/update-project/message', async context => {
      const body = (await context.req.json().catch(() => undefined)) as { text?: unknown } | undefined
      if (typeof body?.text !== 'string') return reply(context, refused('the message is missing'))
      return reply(context, await actions.sendUpdateMessage(context.req.param('name'), body.text))
    })
    .post('/api/projects/:name/update-project/close', async context => reply(context, await actions.closeUpdateProject(context.req.param('name'))))
}

/** Run an action that only needs the repo name */
type ByName = (name: string) => Promise<ActionResult>

/** Run an action with the fingerprint of the preview the user confirmed */
type ByFingerprint = (name: string, fingerprint: string) => Promise<ActionResult>

/** The actions with a route of their own: the file fixes stream their steps, the sync of the infos takes the values the user edited */
type CustomAction = 'fix-files' | 'sync-github-metadata'

/**
 * The actions by route, typed so a route can not be forgotten: the previews, the actions that check the fingerprint of the preview, and the ones that only need the name
 * @param actions the actions
 * @returns the actions of each kind, as route and function pairs
 */
function byRoute(actions: Actions) {
  const previews: Record<PreviewedAction, (name: string) => Promise<{ ok: boolean }>> = {
    'delete-branches': actions.previewDeleteBranches,
    'delete-clone': actions.previewDeleteClone,
    'delete-fork': actions.previewDeleteFork,
    'delete-project': actions.previewDeleteProject,
    discard: actions.previewDiscard,
    'fix-files': actions.previewFixFiles,
    'fix-git': actions.previewFixGit,
    'sync-github-metadata': actions.previewSyncGithubMetadata,
  }
  const fingerprinted: Record<Exclude<FingerprintedAction, CustomAction>, ByFingerprint> = { 'delete-branches': actions.deleteBranches, discard: actions.discard, 'fix-git': actions.fixGit }
  const named: Record<Exclude<PostedAction, CustomAction | FingerprintedAction>, ByName> = {
    archive: actions.archive,
    'checkout-default': actions.checkoutDefault,
    clone: actions.clone,
    'delete-clone': actions.deleteClone,
    'delete-fork': actions.deleteFork,
    'delete-project': actions.deleteProject,
    unarchive: actions.unarchive,
    'unarchive-push': actions.unarchivePush,
  }
  return { fingerprinted: Object.entries(fingerprinted), named: Object.entries(named), previews: Object.entries(previews) }
}

/**
 * Refuse a name that is not a plain repo name, before any action sees it
 * @param context the request context
 * @param next the next handler
 * @returns a 409 response with the reason for another name, nothing otherwise
 */
const refuseOtherNames: MiddlewareHandler<object, '/api/projects/:name/*'> = async (context, next) => {
  const name = context.req.param('name')
  if (!isRepoName(name)) return reply(context, refused(`${name} is not a repo name`))
  await next()
  return undefined
}

/**
 * The routes of the actions: each one asks the action to prove everything again before it acts, whatever the page sent. `GET` says what an action would do, `POST` runs it
 * @param actions the actions
 * @returns the routes, to mount on the app after its guards
 * @example new Hono().use(guard).route('/', actionRoutes(actions))
 */
export function actionRoutes(actions: Actions) {
  const app = new Hono().use('/api/projects/:name/*', refuseOtherNames)
  const { fingerprinted, named, previews } = byRoute(actions)
  for (const [route, preview] of previews) app.get(`/api/projects/:name/${route}`, async context => reply(context, await preview(context.req.param('name'))))
  for (const [route, run] of fingerprinted) app.post(`/api/projects/:name/${route}`, async context => reply(context, await run(context.req.param('name'), context.req.query('fingerprint') ?? '')))
  for (const [route, run] of named) app.post(`/api/projects/:name/${route}`, async context => reply(context, await run(context.req.param('name'))))
  return app
    .post('/api/projects/:name/fix-files', async context => {
      const [name, fingerprint] = [context.req.param('name'), context.req.query('fingerprint') ?? '']
      if (context.req.query('commit') !== 'true') return reply(context, await actions.fixFiles(name, fingerprint))
      return stream(onStage => actions.fixFiles(name, fingerprint, { commit: true, onStage }))
    })
    .post('/api/projects/:name/sync-github-metadata', async context => {
      const body = (await context.req.json().catch(() => undefined)) as Partial<MetadataValues> | undefined
      if (typeof body?.description !== 'string' || typeof body.homepage !== 'string') return reply(context, refused('the description and the homepage to set are missing'))
      return reply(context, await actions.syncGithubMetadata(context.req.param('name'), { description: body.description, homepage: body.homepage }))
    })
    .get('/api/projects/:name/live', async context => reply(context, await actions.live(context.req.param('name'), context.req.query('since') ?? '')))
    .get('/api/projects/:name/rescan', async context => reply(context, await actions.rescan(context.req.param('name'))))
    .route('/', updateRoutes(actions))
}
