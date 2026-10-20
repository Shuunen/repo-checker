import { type ActionResult, type FixStage, refused, type PostedAction, postedActions } from '../../shared/action.ts'

/** What the page can give to `postAction` */
interface PostOptions {
  /** What the server needs to run the action, sent as JSON, for the actions the user edits before confirming */
  body?: object | undefined
  /** The fingerprint of the list the user confirmed, for the actions that throw something away */
  fingerprint?: string | undefined
  /** True to ask the server to commit what the action wrote */
  isCommit?: boolean
  /** Called when the server says it enters a step, for the actions that stream their steps */
  onStage?: ((stage: FixStage) => void) | undefined
}

/**
 * Read one line of a stream of steps: tell the step, or give the result that ends the stream
 * @param line the JSON line
 * @param onStage called with the step
 * @returns the result when the line is the last one
 */
function readLine(line: string, onStage: ((stage: FixStage) => void) | undefined) {
  const { result, stage } = JSON.parse(line) as { result?: ActionResult; stage?: FixStage }
  if (stage !== undefined) onStage?.(stage)
  return result
}

/**
 * Read the answer of an action: one JSON, or the lines of a stream of steps that ends with the result
 * @param response the response
 * @param onStage called with each step the server enters
 * @returns the result
 */
async function readResult(response: Response, onStage: ((stage: FixStage) => void) | undefined) {
  if (response.headers.get('content-type') !== 'application/x-ndjson' || response.body === null) return response.json().catch((): ActionResult => refused(`the server answered HTTP ${response.status}`)) as Promise<ActionResult>
  const decoder = new TextDecoder()
  let result: ActionResult = refused('the server stopped answering before the end of the action')
  let rest = ''
  for await (const chunk of response.body) {
    const text = rest + decoder.decode(chunk, { stream: true })
    const end = text.lastIndexOf('\n') + 1
    rest = text.slice(end)
    result =
      text
        .slice(0, end)
        .split('\n')
        .filter(Boolean)
        .map(line => readLine(line, onStage))
        .find(Boolean) ?? result
  }
  return result
}

/**
 * Ask the server to run an action on a project. The `x-repo-check` header is required by the server for any request that changes something
 * @param name the repo name
 * @param action the action
 * @param options the optional parts
 * @param options.body what the server needs to run the action, sent as JSON
 * @param options.fingerprint the fingerprint of the list the user confirmed, for the actions that throw something away
 * @param options.isCommit true to ask the server to commit what the action wrote
 * @param options.onStage called with each step the server enters
 * @returns why the automatic commit was prevented when it was, nothing otherwise, when the action worked
 * @throws {Error} with the reason when the server refused it or it failed
 * @example await postAction('finga', 'clone')
 */
export async function postAction(name: string, action: PostedAction, { body, fingerprint, isCommit = false, onStage }: Readonly<PostOptions> = {}) {
  const params = new URLSearchParams()
  if (fingerprint !== undefined) params.set('fingerprint', fingerprint)
  if (isCommit) params.set('commit', 'true')
  const query = params.size === 0 ? '' : `?${params}`
  const response = await fetch(`/api/projects/${encodeURIComponent(name)}/${action}${query}`, { headers: { 'x-repo-check': '1' }, method: 'POST', ...(body !== undefined && { body: JSON.stringify(body) }) })
  const result = await readResult(response, onStage)
  if (!result.ok) throw new Error(result.reason)
  return result.commitBlocked
}

/**
 * What the toast says once an action worked
 * @param action the action
 * @param name the repo name
 * @returns the message
 * @example doneMessage('clone', 'finga') // 'Cloned finga'
 */
export function doneMessage(action: PostedAction, name: string) {
  return postedActions[action].done.replace('{name}', name)
}
