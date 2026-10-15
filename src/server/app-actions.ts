import { type Context, Hono } from 'hono'
import type { ActionResult, FixStage } from '../shared/action.ts'
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
function reply(context: Context, result: Readonly<{ ok: boolean }>) {
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
 * The routes of the actions: each one asks the action to prove everything again before it acts, whatever the page sent
 * @param actions the actions
 * @returns the routes, to mount on the app after its guards
 * @example new Hono().use(guard).route('/', actionRoutes(actions))
 */
export function actionRoutes(actions: Actions) {
  return new Hono()
    .post('/api/projects/:name/archive', async context => reply(context, await actions.archive(context.req.param('name'))))
    .post('/api/projects/:name/sync-github-metadata', async context => reply(context, await actions.syncGithubMetadata(context.req.param('name'))))
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
    .get('/api/projects/:name/rescan', async context => reply(context, await actions.rescan(context.req.param('name'))))
    .get('/api/projects/:name/fix-files', async context => reply(context, await actions.previewFixFiles(context.req.param('name'))))
    .post('/api/projects/:name/fix-files', async context => {
      const [name, fingerprint] = [context.req.param('name'), context.req.query('fingerprint') ?? '']
      if (context.req.query('commit') !== 'true') return reply(context, await actions.fixFiles(name, fingerprint))
      return stream(onStage => actions.fixFiles(name, fingerprint, { commit: true, onStage }))
    })
    .get('/api/projects/:name/discard', async context => reply(context, await actions.previewDiscard(context.req.param('name'))))
    .post('/api/projects/:name/discard', async context => reply(context, await actions.discard(context.req.param('name'), context.req.query('fingerprint') ?? '')))
}
