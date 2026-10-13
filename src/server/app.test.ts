import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { ScanEvent } from '../shared/scan-event.ts'
import { app } from './app-fixtures.ts'
import { createApp, type ScanRunner, toScanProject } from './app.ts'
import type { ProjectResult } from './check-projects.ts'

const result: ProjectResult = {
  findings: [
    { actions: [], edits: [], message: 'no license', messageId: 'missing', ruleId: 'license-exists', scope: 'file', severity: 'error' },
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
      scope: 'file',
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
  it('streams started, the progress, each project, then done', async () => {
    expect.hasAssertions()
    const runScan = vi.fn<ScanRunner>((_shouldFetch, { onProgress, onProject }) => {
      onProgress('checking 1 project')
      onProject(result)
      return Promise.resolve({ isSingle: false, owner: 'owner' })
    })
    const events = await readEvents(await app(runScan).request('http://127.0.0.1/api/scan'))
    expect(events.map(({ event }) => event)).toStrictEqual(['started', 'progress', 'project', 'done'])
    expect(events.slice(0, 2).map(({ data }) => data)).toStrictEqual([
      { target: '/projects', type: 'started' },
      { line: 'checking 1 project', type: 'progress' },
    ])
    // JSON drops the undefined fields, like `github` of a project without repo, so the page reads them as missing
    expect(events[2]?.data).toStrictEqual({ result: { ...toScanProject(result), project: { isOtherOwner: false, name: 'app' } }, type: 'project' })
    expect(events[3]?.data).toMatchObject({ isSingle: false, owner: 'owner', type: 'done' })
  })

  it('answers with an event stream', async () => {
    expect.hasAssertions()
    const response = await app(() => Promise.resolve({ isSingle: true, owner: 'owner' })).request('http://localhost/api/scan')
    expect(response.headers.get('content-type')).toBe('text/event-stream')
  })

  it('skips the fetch when asked', async () => {
    expect.hasAssertions()
    const runScan = vi.fn<ScanRunner>(() => Promise.resolve({ isSingle: true, owner: 'owner' }))
    const response = await app(runScan).request('http://localhost/api/scan?fetch=false')
    await response.text()
    expect(runScan).toHaveBeenCalledWith(false, expect.any(Object))
  })

  it('fetches by default', async () => {
    expect.hasAssertions()
    const runScan = vi.fn<ScanRunner>(() => Promise.resolve({ isSingle: true, owner: 'owner' }))
    const response = await app(runScan).request('http://localhost/api/scan')
    await response.text()
    expect(runScan).toHaveBeenCalledWith(true, expect.any(Object))
  })

  it('serves the web app', async () => {
    expect.hasAssertions()
    const webFolder = await mkdtemp(path.join(tmpdir(), 'repo-check-web-'))
    onTestFinished(() => rm(webFolder, { force: true, recursive: true }))
    await writeFile(path.join(webFolder, 'index.html'), '<title>repo-check</title>')
    const response = await app(vi.fn<ScanRunner>(), webFolder).request('http://127.0.0.1/')
    await expect(response.text()).resolves.toBe('<title>repo-check</title>')
  })

  it.each(['/project/jozzo', '/project/ghuser.io.settings'])('serves the page on the project address %s, so a reload works', async address => {
    expect.hasAssertions()
    const webFolder = await mkdtemp(path.join(tmpdir(), 'repo-check-web-'))
    onTestFinished(() => rm(webFolder, { force: true, recursive: true }))
    await writeFile(path.join(webFolder, 'index.html'), '<title>repo-check</title>')
    const response = await app(vi.fn<ScanRunner>(), webFolder).request(`http://127.0.0.1${address}`)
    await expect(response.text()).resolves.toBe('<title>repo-check</title>')
  })

  it('answers 404 for an unknown file', async () => {
    expect.hasAssertions()
    const response = await app(vi.fn<ScanRunner>()).request('http://127.0.0.1/assets/missing.js')
    expect(response.status).toBe(404)
  })

  it.each([
    ['an Error', new Error('gh api user failed')],
    ['a string', 'gh api user failed'],
  ])('streams failed when the scan throws %s', async (_name, error) => {
    expect.hasAssertions()
    const runScan = vi.fn<ScanRunner>(() => Promise.reject(error))
    const events = await readEvents(await app(runScan).request('http://127.0.0.1/api/scan'))
    expect(events.map(({ data }) => data)).toStrictEqual([
      { target: '/projects', type: 'started' },
      { message: 'gh api user failed', type: 'failed' },
    ])
  })

  it('refuses a request for another host, against DNS rebinding', async () => {
    expect.hasAssertions()
    const runScan = vi.fn<ScanRunner>()
    const response = await app(runScan).request('http://evil.example/api/scan')
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
