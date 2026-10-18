import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aFinding, aProject, scanRequest, stubApi } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

vi.mock(import('./scan/live-project.ts'), async importOriginal => ({ ...(await importOriginal()), pollMs: 20 as never }))

const notCloned = aFinding({ actions: ['clone'], message: 'on GitHub but not cloned', messageId: 'missing', ruleId: 'not-cloned', scope: 'project', severity: 'info' })
const events: ScanEvent[] = [
  { target: '/projects', type: 'started' },
  { result: aProject('finga', [notCloned], { local: undefined }), type: 'project' },
  { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
]
const changed = (project = aProject('finga'), remote = 'fresh') => Response.json({ changed: true, fingerprint: 'f2', ok: true, project: { ...project, project: { ...project.project, local: { ...project.project.local, currentBranch: 'edited-branch' } } }, remote, target: '/projects' })

/**
 * The calls the page made to watch the project
 * @param fetchMock the fake fetch
 * @returns the addresses
 */
function liveCalls(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.map(([url]) => String(url)).filter(url => url.includes('/live?'))
}

describe('watching the open project', () => {
  it('replaces the project in place when the server says it changed', async () => {
    expect.hasAssertions()
    stubApi({ live: changed() })
    renderApp(scanRequest(events), '/project/finga')
    await waitFor(() => expect(screen.getByTestId('fact-branch').textContent).toBe('edited-branch'))
    await waitFor(() => expect(screen.getByTestId('live-status').textContent).toMatch(/^Up to date at /u))
  })

  it('says when GitHub is not read again because its rate limit is low', async () => {
    expect.hasAssertions()
    stubApi({ live: changed(aProject('finga'), 'paused') })
    renderApp(scanRequest(events), '/project/finga')
    await waitFor(() => expect(screen.getByTestId('live-status').textContent).toContain('its rate limit is low'))
  })

  it('removes the project when the server says it is gone', async () => {
    expect.hasAssertions()
    stubApi({ live: Response.json({ changed: true, fingerprint: '', ok: true, project: undefined, remote: 'fresh', target: '/projects' }) })
    renderApp(scanRequest(events), '/project/finga')
    await waitFor(() => expect(screen.getByTestId('project-missing').textContent).toBe('No project named finga in this scan'))
  })

  it('sends back the fingerprint it got, and leaves the project alone when nothing changed', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi()
    renderApp(scanRequest(events), '/project/finga')
    await waitFor(() => expect(liveCalls(fetchMock).length).toBeGreaterThan(2))
    expect(liveCalls(fetchMock).slice(0, 2)).toStrictEqual(['/api/projects/finga/live?since=', '/api/projects/finga/live?since=abc'])
    expect(screen.queryByTestId('fact-branch')).toBeNull()
  })

  it('keeps going when the server refuses or cannot be reached', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ live: new Error('offline') })
    renderApp(scanRequest(events), '/project/finga')
    await waitFor(() => expect(liveCalls(fetchMock).length).toBeGreaterThan(1))
    expect(screen.getByTestId('live-status').textContent).toBe('Watching this project for changes')
  })

  it('asks nothing while a dialog is open', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi()
    renderApp(scanRequest(events), '/project/finga')
    await waitFor(() => expect(liveCalls(fetchMock).length).toBeGreaterThan(0))
    fireEvent.click(await screen.findByTestId('action-clone'))
    await screen.findByTestId('clone-confirm')
    const before = liveCalls(fetchMock).length
    await new Promise(resolve => {
      setTimeout(resolve, 100)
    })
    expect(liveCalls(fetchMock)).toHaveLength(before)
  })

  it('asks nothing while the tab is hidden', async () => {
    expect.hasAssertions()
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    onTestFinished(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    })
    const fetchMock = stubApi()
    renderApp(scanRequest(events), '/project/finga')
    await screen.findByTestId('live-status')
    await new Promise(resolve => {
      setTimeout(resolve, 100)
    })
    expect(liveCalls(fetchMock)).toHaveLength(0)
  })

  it('stops watching when the page is left, even for an answer still on its way', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi()
    const slow = Promise.withResolvers<Response>()
    fetchMock.mockReturnValue(slow.promise)
    renderApp(scanRequest(events), '/project/finga')
    await waitFor(() => expect(liveCalls(fetchMock)).toHaveLength(1))
    fireEvent.click(await screen.findByTestId('back'))
    slow.resolve(changed())
    await new Promise(resolve => {
      setTimeout(resolve, 100)
    })
    expect(liveCalls(fetchMock)).toHaveLength(1)
  })
})
