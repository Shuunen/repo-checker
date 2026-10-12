import type { ScanEvent } from '../shared/scan-event.ts'
import { createApp, type ScanRunner, toScanProject } from './app.ts'
import type { ProjectResult } from './scan.ts'

const result: ProjectResult = {
  findings: [
    { actions: [], edits: [], message: 'no license', messageId: 'missing', ruleId: 'license-exists', severity: 'error' },
    {
      actions: [],
      edits: [
        { apply: text => text, file: 'package.json' },
        { apply: text => text, file: 'package.json' },
        { apply: text => text, file: 'README.md' },
      ],
      message: 'no name',
      messageId: 'missing',
      ruleId: 'package-name',
      severity: 'warning',
    },
  ],
  outcomes: [{ ruleId: 'license-exists', status: 'failed' }],
  project: { github: undefined, isOtherOwner: false, local: undefined, name: 'app' },
}

/**
 * Read a server-sent events body
 * @param response the response
 * @returns the event names and their parsed data
 */
async function readEvents(response: Readonly<Response>) {
  const body = await response.text()
  const blocks = body.split('\n\n').filter(block => block !== '')
  return blocks.map(block => {
    const fields = Object.fromEntries(block.split('\n').map(line => [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1).trim()]))
    return { data: JSON.parse(String(fields.data)) as ScanEvent, event: fields.event }
  })
}

describe(createApp, () => {
  it('streams the progress, each project, then done', async () => {
    expect.hasAssertions()
    const runScan = vi.fn<ScanRunner>((_shouldFetch, { onProgress, onProject }) => {
      onProgress('checking 1 project')
      onProject(result)
      return Promise.resolve({ isSingle: false, owner: 'owner' })
    })
    const events = await readEvents(await createApp(runScan).request('http://127.0.0.1/api/scan'))
    expect(events.map(({ event }) => event)).toStrictEqual(['progress', 'project', 'done'])
    expect(events[0]?.data).toStrictEqual({ line: 'checking 1 project', type: 'progress' })
    // JSON drops the undefined fields, like `github` of a project without repo, so the page reads them as missing
    expect(events[1]?.data).toStrictEqual({ result: { ...toScanProject(result), project: { isOtherOwner: false, name: 'app' } }, type: 'project' })
    expect(events[2]?.data).toMatchObject({ isSingle: false, owner: 'owner', type: 'done' })
    expect(runScan).toHaveBeenCalledWith(true, expect.any(Object))
  })

  it('answers with an event stream', async () => {
    expect.hasAssertions()
    const response = await createApp(() => Promise.resolve({ isSingle: true, owner: 'owner' })).request('http://localhost/api/scan')
    expect(response.headers.get('content-type')).toBe('text/event-stream')
  })

  it('skips the fetch when asked', async () => {
    expect.hasAssertions()
    const runScan = vi.fn<ScanRunner>(() => Promise.resolve({ isSingle: true, owner: 'owner' }))
    const response = await createApp(runScan).request('http://localhost/api/scan?fetch=false')
    await response.text()
    expect(runScan).toHaveBeenCalledWith(false, expect.any(Object))
  })

  it.each([
    ['an Error', new Error('gh api user failed')],
    ['a string', 'gh api user failed'],
  ])('streams failed when the scan throws %s', async (_name, error) => {
    expect.hasAssertions()
    const runScan = vi.fn<ScanRunner>(() => Promise.reject(error))
    const events = await readEvents(await createApp(runScan).request('http://127.0.0.1/api/scan'))
    expect(events.map(({ data }) => data)).toStrictEqual([{ message: 'gh api user failed', type: 'failed' }])
  })

  it('refuses a request for another host, against DNS rebinding', async () => {
    expect.hasAssertions()
    const runScan = vi.fn<ScanRunner>()
    const response = await createApp(runScan).request('http://evil.example/api/scan')
    expect(response.status).toBe(403)
    expect(runScan).not.toHaveBeenCalled()
  })
})

describe(toScanProject, () => {
  it('keeps the files of each fix, once each, instead of its edits', () => {
    expect.hasAssertions()
    const { findings } = toScanProject(result)
    expect(findings.map(finding => finding.fixFiles)).toStrictEqual([[], ['package.json', 'README.md']])
    expect(structuredClone(findings)).toStrictEqual(findings)
  })
})
