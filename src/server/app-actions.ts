import { type Context, Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { ActionResult, FixStage, MetadataValues } from '../shared/action.ts'
import type { ChatEvent } from '../shared/claude.ts'
import type { Actions } from './actions/actions-contract.ts'

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
 * The routes of the fixes: the files, then the git issues
 * @param actions the actions
 * @returns the routes
 */
function fixRoutes(actions: Actions) {
  return new Hono()
    .get('/api/projects/:name/fix-files', async context => reply(context, await actions.previewFixFiles(context.req.param('name'))))
    .post('/api/projects/:name/fix-files', async context => {
      const [name, fingerprint] = [context.req.param('name'), context.req.query('fingerprint') ?? '']
      if (context.req.query('commit') !== 'true') return reply(context, await actions.fixFiles(name, fingerprint))
      return stream(onStage => actions.fixFiles(name, fingerprint, { commit: true, onStage }))
    })
    .get('/api/projects/:name/fix-git', async context => reply(context, await actions.previewFixGit(context.req.param('name'))))
    .post('/api/projects/:name/fix-git', async context => reply(context, await actions.fixGit(context.req.param('name'), context.req.query('fingerprint') ?? '')))
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
        let queue = Promise.resolve()
        const send = (event: ChatEvent) => {
          queue = queue.then(() => sse.writeSSE({ data: JSON.stringify(event), event: event.type }))
          if (event.type === 'exit') void queue.then(() => ended.resolve(undefined))
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
      if (typeof body?.text !== 'string') return reply(context, { ok: false, reason: 'the message is missing' })
      return reply(context, await actions.sendUpdateMessage(context.req.param('name'), body.text))
    })
    .post('/api/projects/:name/update-project/close', async context => reply(context, await actions.closeUpdateProject(context.req.param('name'))))
}

/**
 * The routes of the actions: each one asks the action to prove everything again before it acts, whatever the page sent
 * @param actions the actions
 * @returns the routes, to mount on the app after its guards
 * @example new Hono().use(guard).route('/', actionRoutes(actions))
 */
export function actionRoutes(actions: Actions) {
  return new Hono()
    .post('/api/projects/:name/archive', async context => reply(context, await actions.archive(context.req.param('name'))))
    .get('/api/projects/:name/sync-github-metadata', async context => reply(context, await actions.previewSyncGithubMetadata(context.req.param('name'))))
    .post('/api/projects/:name/sync-github-metadata', async context => {
      const body = (await context.req.json().catch(() => undefined)) as Partial<MetadataValues> | undefined
      if (typeof body?.description !== 'string' || typeof body.homepage !== 'string') return reply(context, { ok: false, reason: 'the description and the homepage to set are missing' })
      const values = { description: body.description, homepage: body.homepage }
      return reply(context, await actions.syncGithubMetadata(context.req.param('name'), values))
    })
    .post('/api/projects/:name/unarchive', async context => reply(context, await actions.unarchive(context.req.param('name'))))
    .post('/api/projects/:name/clone', async context => reply(context, await actions.clone(context.req.param('name'))))
    .post('/api/projects/:name/checkout-default', async context => reply(context, await actions.checkoutDefault(context.req.param('name'))))
    .get('/api/projects/:name/delete-clone', async context => reply(context, await actions.previewDeleteClone(context.req.param('name'))))
    .post('/api/projects/:name/delete-clone', async context => reply(context, await actions.deleteClone(context.req.param('name'))))
    .post('/api/projects/:name/unarchive-push', async context => reply(context, await actions.unarchivePush(context.req.param('name'))))
    .get('/api/projects/:name/delete-fork', async context => reply(context, await actions.previewDeleteFork(context.req.param('name'))))
    .post('/api/projects/:name/delete-fork', async context => reply(context, await actions.deleteFork(context.req.param('name'))))
    .get('/api/projects/:name/delete-project', async context => reply(context, await actions.previewDeleteProject(context.req.param('name'))))
    .post('/api/projects/:name/delete-project', async context => reply(context, await actions.deleteProject(context.req.param('name'))))
    .get('/api/projects/:name/live', async context => reply(context, await actions.live(context.req.param('name'), context.req.query('since') ?? '')))
    .get('/api/projects/:name/rescan', async context => reply(context, await actions.rescan(context.req.param('name'))))
    .get('/api/projects/:name/discard', async context => reply(context, await actions.previewDiscard(context.req.param('name'))))
    .post('/api/projects/:name/discard', async context => reply(context, await actions.discard(context.req.param('name'), context.req.query('fingerprint') ?? '')))
    .route('/', fixRoutes(actions))
    .route('/', updateRoutes(actions))
}
