import type { ScanEvent, ScanFinding, ScanProject } from '../shared/scan-event.ts'
import type { FetchScan } from './scan/scan-query.ts'

/**
 * A finding, a file warning unless told otherwise
 * @param fields the fields to change
 * @returns the finding
 */
export function aFinding(fields: Readonly<Partial<ScanFinding>> = {}): ScanFinding {
  return { actions: [], fixFiles: [], message: 'something is off', messageId: 'found', ruleId: 'some-check', scope: 'file', severity: 'warning', ...fields }
}

/**
 * A project result: a clone on master of a GitHub repo pushed in October 2026, with the given findings
 * @param name the project name
 * @param findings the findings
 * @param project the project fields to change
 * @returns the result
 */
export function aProject(name: string, findings: readonly ScanFinding[] = [], project: Readonly<Partial<ScanProject['project']>> = {}): ScanProject {
  const github = { forkStatus: undefined, isArchived: false, isFork: false, isPrivate: false, name, owner: 'owner', pushedAt: '2026-10-01T10:00:00Z', slug: `owner/${name}` }
  const local = { branches: [], changedFiles: [], currentBranch: 'master', fetchFailed: false, folderName: name, localOnlyBranches: [], origin: `git@github.com:owner/${name}.git`, path: `/projects/${name}`, problem: undefined, slug: `owner/${name}`, stashes: [], unpushed: [] }
  return { findings: [...findings], outcomes: [], project: { github, isOtherOwner: false, local, name, ...project } }
}

/**
 * Cut a text in chunks
 * @param text the text
 * @param size how many characters per chunk, the whole text in one chunk when infinite
 * @returns the chunks
 */
function cut(text: string, size: number) {
  if (size === Number.POSITIVE_INFINITY) return [text]
  return Array.from({ length: Math.ceil(text.length / size) }, (_item, index) => text.slice(index * size, (index + 1) * size))
}

/**
 * A server-sent events response, as `GET /api/scan` streams it, cut in chunks of the given size so events can arrive split
 * @param events the events
 * @param chunkSize how many characters per chunk
 * @returns the response
 */
export function sseResponse(events: readonly ScanEvent[], chunkSize = Number.POSITIVE_INFINITY) {
  const encoder = new TextEncoder()
  const chunks = cut(events.map(event => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(''), chunkSize)
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
        controller.close()
      },
    }),
  )
}

/**
 * A scan request that answers with the given events, a mock to count the scans
 * @param events the events
 * @returns the request
 */
export function scanRequest(events: readonly ScanEvent[]) {
  return vi.fn<FetchScan>(() => Promise.resolve(sseResponse(events)))
}

/** What the fake server answers: the action (a POST), what the action would do (a preview, a GET), and one project scanned again (the rescan, a GET) */
interface ApiAnswers {
  /** The answer to an action */
  action?: Response
  /** The answer to a preview, or the error when the server cannot be reached */
  preview?: Error | Response
  /** The answer to the rescan of one project, or the error when the server cannot be reached */
  rescan?: Error | Response
}

/**
 * Replace fetch with a fake server, put the real one back when the test ends. A POST is an action, a GET ending with `/rescan` is the rescan of one project, any other GET is a preview. Each answer can be read again, it is cloned on every call
 * @param answers what the server answers
 * @param answers.action the answer to an action
 * @param answers.preview the answer to a preview
 * @param answers.rescan the answer to the rescan of one project
 * @returns the fake fetch
 */
export function stubApi({ action = Response.json({ message: 'done', ok: true }), preview = Response.json({ ok: false, reason: 'no preview' }), rescan = Response.json({ ok: true }) }: Readonly<ApiAnswers> = {}) {
  const fetchMock = vi.fn<typeof fetch>((url, init) => {
    if (init?.method === 'POST') return Promise.resolve(action.clone())
    if (String(url).endsWith('/rescan')) return rescan instanceof Error ? Promise.reject(rescan) : Promise.resolve(rescan.clone())
    return preview instanceof Error ? Promise.reject(preview) : Promise.resolve(preview.clone())
  })
  vi.stubGlobal('fetch', fetchMock)
  onTestFinished(() => {
    vi.unstubAllGlobals()
  })
  return fetchMock
}
