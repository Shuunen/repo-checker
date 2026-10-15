import type { ActionResult, FixStage } from '../../shared/action.ts'

/** The actions that change something, a route of the server each */
type PostedAction = 'archive' | 'checkout-default' | 'clone' | 'delete-clone' | 'delete-fork' | 'delete-project' | 'discard' | 'fix-files' | 'sync-github-metadata' | 'unarchive' | 'unarchive-push'

/** What the page can give to `postAction` */
interface PostOptions {
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
  if (response.headers.get('content-type') !== 'application/x-ndjson' || response.body === null) return response.json().catch((): ActionResult => ({ ok: false, reason: `the server answered HTTP ${response.status}` })) as Promise<ActionResult>
  const decoder = new TextDecoder()
  let result: ActionResult = { ok: false, reason: 'the server stopped answering before the end of the action' }
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
 * @param options.fingerprint the fingerprint of the list the user confirmed, for the actions that throw something away
 * @param options.isCommit true to ask the server to commit what the action wrote
 * @param options.onStage called with each step the server enters
 * @returns why the automatic commit was prevented when it was, nothing otherwise, when the action worked
 * @throws {Error} with the reason when the server refused it or it failed
 * @example await postAction('finga', 'clone')
 */
export async function postAction(name: string, action: PostedAction, { fingerprint, isCommit = false, onStage }: Readonly<PostOptions> = {}) {
  const params = new URLSearchParams()
  if (fingerprint !== undefined) params.set('fingerprint', fingerprint)
  if (isCommit) params.set('commit', 'true')
  const query = params.size === 0 ? '' : `?${params}`
  const response = await fetch(`/api/projects/${encodeURIComponent(name)}/${action}${query}`, { headers: { 'x-repo-check': '1' }, method: 'POST' })
  const result = await readResult(response, onStage)
  if (!result.ok) throw new Error(result.reason)
  return result.commitBlocked
}

/** What the toast says once an action worked, `{name}` being the project */
export const doneMessages: Record<PostedAction, string> = {
  archive: 'Archived {name} on GitHub',
  'checkout-default': 'Checked out the default branch of {name}',
  clone: 'Cloned {name}',
  'delete-clone': 'Deleted the clone of {name}',
  'delete-fork': 'Deleted the fork of {name}',
  'delete-project': 'Deleted {name}, its GitHub repo and its clone',
  discard: 'Discarded the unsaved work of {name}',
  'fix-files': 'Fixed the files of {name}',
  'sync-github-metadata': 'Copied the description and homepage of {name} to GitHub',
  unarchive: 'Unarchived {name} on GitHub',
  'unarchive-push': 'Unarchived and pushed {name}',
}
