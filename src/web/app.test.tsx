import { fireEvent, screen } from '@testing-library/react'
import type { ScanEvent } from '../shared/scan-event.ts'
import { App } from './app.tsx'
import { aFinding, aProject, scanRequest, sseResponse } from './fixtures.ts'
import { renderApp } from './render-app.tsx'
import type { FetchScan } from './scan/scan-query.ts'

const jozzo = aProject('jozzo', [aFinding({ actions: ['unarchive-push-rearchive'], messageId: 'unsaved', ruleId: 'archived-with-unsaved-work', scope: 'project', severity: 'error' })])
const finga = aProject('finga', [aFinding({ actions: ['clone'], messageId: 'missing', ruleId: 'not-cloned', scope: 'project', severity: 'info' })], { local: undefined })
const scanEvents: ScanEvent[] = [
  { target: '/projects', type: 'started' },
  { line: 'checking 2 projects', type: 'progress' },
  { result: finga, type: 'project' },
  { result: jozzo, type: 'project' },
  { durationMs: 1500, isSingle: false, owner: 'owner', type: 'done' },
]

describe(App, () => {
  it('fills the table and the tiles from the scan stream', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(scanEvents))
    const row = await screen.findByTestId('row-jozzo')
    expect(row.textContent).toContain('1 error')
    expect(screen.getByTestId('scan-line').textContent).toBe('/projects · owner · scanned in 1.5s')
    expect(screen.getByTestId('tile-at-risk').textContent).toBe('At risk 1')
    expect(screen.getByTestId('filter-not-cloned').textContent).toBe('Not cloned1')
  })

  it('shows the projects of the selected filter', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(scanEvents))
    await screen.findByTestId('row-jozzo')
    fireEvent.click(screen.getByTestId('filter-not-cloned'))
    expect(screen.queryByTestId('row-jozzo')).toBeNull()
    expect(screen.getByTestId('row-finga').textContent).toContain('Actions')
  })

  it('filters the table with the health bar and clears the filter on a second click', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(scanEvents))
    await screen.findByTestId('row-jozzo')
    fireEvent.click(screen.getByTestId('bucket-error'))
    expect(screen.queryByTestId('row-finga')).toBeNull()
    expect(screen.getByTestId('row-jozzo')).toBeDefined()
    fireEvent.click(screen.getByTestId('bucket-error'))
    expect(screen.getByTestId('row-finga')).toBeDefined()
  })

  it('folds the quiet archived projects in one row that shows them', async () => {
    expect.hasAssertions()
    const old = aProject('old', [], { github: { ...aProject('old').project.github, isArchived: true } as never })
    renderApp(
      scanRequest([
        { target: '/projects', type: 'started' },
        { result: jozzo, type: 'project' },
        { result: old, type: 'project' },
        { durationMs: 10, isSingle: false, owner: 'owner', type: 'done' },
      ]),
    )
    await screen.findByTestId('row-jozzo')
    expect(screen.queryByTestId('row-old')).toBeNull()
    expect(screen.getByTestId('archived-fold').textContent).toContain('1 archived project')
    fireEvent.click(screen.getByTestId('archived-toggle'))
    expect(screen.getByTestId('row-old')).toBeDefined()
    expect(screen.getByTestId('archived-toggle').textContent).toBe('Hide')
  })

  it('searches the projects by name and counts the result', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(scanEvents))
    await screen.findByTestId('row-jozzo')
    expect(screen.getByTestId('result-count').textContent).toBe('2 of 2 projects')
    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'joz' } })
    expect(screen.queryByTestId('row-finga')).toBeNull()
    expect(screen.getByTestId('row-jozzo')).toBeDefined()
    expect(screen.getByTestId('result-count').textContent).toBe('1 of 2 projects')
  })

  it('leaves public and active blank and shows private and archived', async () => {
    expect.hasAssertions()
    const secret = aProject('secret', [aFinding()], { github: { ...aProject('secret').project.github, isArchived: true, isPrivate: true } as never })
    renderApp(
      scanRequest([
        { target: '/projects', type: 'started' },
        { result: jozzo, type: 'project' },
        { result: secret, type: 'project' },
        { durationMs: 10, isSingle: false, owner: 'owner', type: 'done' },
      ]),
    )
    await screen.findByTestId('row-jozzo')
    expect(screen.getByTestId('row-jozzo').textContent).not.toMatch(/public|active/u)
    expect(screen.getByTestId('row-secret').textContent).toMatch(/private.*archived/u)
  })

  it('opens the project from the Actions menu of the row', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(scanEvents))
    fireEvent.click(await screen.findByTestId('actions-jozzo'))
    fireEvent.click(await screen.findByTestId('menu-open-project'))
    expect(globalThis.location.pathname).toBe('/project/jozzo')
  })

  it('opens the repo on GitHub from the Actions menu, nothing to open without a repo', async () => {
    expect.hasAssertions()
    const open = vi.spyOn(globalThis, 'open').mockReturnValue(undefined as never)
    renderApp(
      scanRequest([
        { target: '/projects', type: 'started' },
        { result: jozzo, type: 'project' },
        { result: aProject('bare', [], { github: undefined }), type: 'project' },
        { durationMs: 10, isSingle: false, owner: 'owner', type: 'done' },
      ]),
    )
    fireEvent.click(await screen.findByTestId('actions-jozzo'))
    fireEvent.click(await screen.findByTestId('menu-open-github'))
    expect(open).toHaveBeenCalledWith('https://github.com/owner/jozzo', '_blank', 'noopener,noreferrer')
    fireEvent.keyDown(document.body, { key: 'Escape' })
  })

  it('sorts the rows when a column header is clicked', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(scanEvents))
    await screen.findByTestId('row-jozzo')
    expect(screen.getAllByTestId(/^row-/u).map(row => row.dataset.testid)).toStrictEqual(['row-jozzo', 'row-finga'])
    fireEvent.click(screen.getByTestId('column-project'))
    expect(screen.getAllByTestId(/^row-/u).map(row => row.dataset.testid)).toStrictEqual(['row-finga', 'row-jozzo'])
  })

  it('says when a filter holds no project', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(scanEvents))
    await screen.findByTestId('row-jozzo')
    fireEvent.click(screen.getByTestId('filter-forks'))
    expect(screen.getByText('No project here').textContent).toBe('No project here')
  })

  it('scans again on rescan', async () => {
    expect.hasAssertions()
    const request = renderApp(scanRequest(scanEvents))
    await screen.findByTestId('row-jozzo')
    fireEvent.click(screen.getByTestId('rescan'))
    await screen.findByTestId('row-jozzo')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('shows why the scan failed', async () => {
    expect.hasAssertions()
    renderApp(vi.fn<FetchScan>(() => Promise.resolve(sseResponse([{ message: 'gh api user failed', type: 'failed' }]))))
    const failure = await screen.findByTestId('scan-failure')
    expect(failure.textContent).toContain('gh api user failed')
  })

  it('shows when the server does not start the scan', async () => {
    expect.hasAssertions()
    renderApp(vi.fn<FetchScan>(() => Promise.resolve(new Response('nope', { status: 403 }))))
    const failure = await screen.findByTestId('scan-failure')
    expect(failure.textContent).toContain('the server did not start the scan (HTTP 403)')
  })

  it('says it is scanning before the first project', async () => {
    expect.hasAssertions()
    const { promise } = Promise.withResolvers<Response>()
    renderApp(vi.fn<FetchScan>(() => promise))
    const empty = await screen.findByText('Scanning…')
    expect(empty.textContent).toBe('Scanning…')
  })

  it('flags a push that is a year old or more', async () => {
    expect.hasAssertions()
    const github = { ...jozzo.project.github, pushedAt: '2020-01-01T00:00:00Z' } as never
    renderApp(scanRequest([scanEvents[0] as ScanEvent, { result: aProject('stale', [], { github }), type: 'project' }, scanEvents[4] as ScanEvent]))
    const row = await screen.findByTestId('row-stale')
    expect(row.querySelector('.text-warning')).not.toBeNull()
  })
})
