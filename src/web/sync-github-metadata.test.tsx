import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aFinding, aProject, scanRequest, stubApi } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

const noDescription = aFinding({ actions: ['sync-github-metadata'], message: 'the repo has no description on GitHub', messageId: 'missing', ruleId: 'missing-description', scope: 'project', severity: 'warning' })
const events: ScanEvent[] = [
  { target: '/projects', type: 'started' },
  { result: aProject('finga', [noDescription]), type: 'project' },
  { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
]

describe('sync github metadata', () => {
  it('has the long label in the menu of the list', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(events), '/')
    fireEvent.click(await screen.findByTestId('actions-finga'))
    const item = await screen.findByTestId('menu-sync-github-metadata')
    expect(item.textContent).toBe('Copy the description and homepage to GitHub')
  })

  it('copies once confirmed, from the project page', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ message: 'set the description', ok: true }) })
    renderApp(scanRequest(events), '/project/finga')
    fireEvent.click(await screen.findByTestId('action-sync-github-metadata'))
    fireEvent.click(await screen.findByTestId('sync-github-metadata-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/finga/sync-github-metadata', { headers: { 'x-repo-check': '1' }, method: 'POST' }))
  })

  it('shows the reason when the copy is refused', async () => {
    expect.hasAssertions()
    stubApi({ action: Response.json({ ok: false, reason: 'nothing to copy' }, { status: 409 }) })
    renderApp(scanRequest(events), '/')
    fireEvent.click(await screen.findByTestId('actions-finga'))
    fireEvent.click(await screen.findByTestId('menu-sync-github-metadata'))
    fireEvent.click(await screen.findByTestId('sync-github-metadata-confirm'))
    await waitFor(() => expect(screen.getByTestId('sync-github-metadata-error').textContent).toBe('nothing to copy'))
  })
})
