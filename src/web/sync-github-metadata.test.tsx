import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { MetadataPreview } from '../shared/action.ts'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aFinding, aProject, scanRequest, stubApi } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

const noDescription = aFinding({ actions: ['sync-github-metadata'], message: 'the repo has no description on GitHub', messageId: 'missing', ruleId: 'missing-description', scope: 'project', severity: 'warning' })
const events: ScanEvent[] = [
  { isNitpick: false, target: '/projects', type: 'started' },
  { result: aProject('finga', [noDescription]), type: 'project' },
  { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
]

describe('sync github metadata', () => {
  it('has the long label in the menu of the list', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(events), '/')
    fireEvent.click(await screen.findByTestId('actions-finga'))
    const item = await screen.findByTestId('menu-sync-github-metadata')
    expect(item.textContent).toBe('Sync infos')
  })

  it('shows what the package.json and GitHub have in a table, the proposed values in inputs, and sends the edited values', async () => {
    expect.hasAssertions()
    const preview: MetadataPreview = { github: { description: '', homepage: '' }, local: { description: 'A flood game', homepage: 'https://finga.app' }, ok: true, proposed: { description: 'A flood game', homepage: 'https://finga.app' } }
    const fetchMock = stubApi({ action: Response.json({ message: 'set the description', ok: true }), preview: Response.json(preview) })
    renderApp(scanRequest(events), '/project/finga')
    fireEvent.click(await screen.findByTestId('action-sync-github-metadata'))
    const description = await screen.findByTestId('sync-github-metadata-description')
    expect((description as HTMLInputElement).value).toBe('A flood game')
    expect((screen.getByTestId('sync-github-metadata-homepage') as HTMLInputElement).value).toBe('https://finga.app')
    expect(screen.getByTestId('sync-github-metadata-github-description').textContent).toBe('none')
    expect(screen.getByTestId('sync-github-metadata-local-homepage').textContent).toBe('https://finga.app')
    expect(screen.getByTestId('sync-github-metadata-compare-description').textContent).toBe('Different')
    fireEvent.change(description, { target: { value: 'A better game' } })
    fireEvent.click(screen.getByTestId('sync-github-metadata-confirm'))
    const body = JSON.stringify({ description: 'A better game', homepage: 'https://finga.app' })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/finga/sync-github-metadata', { body, headers: { 'x-repo-check': '1' }, method: 'POST' }))
  })

  it('cannot sync when the inputs say what both already have', async () => {
    expect.hasAssertions()
    const preview: MetadataPreview = { github: { description: 'Mine', homepage: '' }, local: { description: 'Mine', homepage: '' }, ok: true, proposed: { description: 'Mine', homepage: '' } }
    stubApi({ preview: Response.json(preview) })
    renderApp(scanRequest(events), '/project/finga')
    fireEvent.click(await screen.findByTestId('action-sync-github-metadata'))
    await screen.findByTestId('sync-github-metadata-preview')
    expect(screen.getByTestId('sync-github-metadata-github-description').textContent).toBe('Mine')
    expect(screen.getByTestId('sync-github-metadata-compare-description').textContent).toBe('Equal')
    expect((screen.getByTestId('sync-github-metadata-confirm') as HTMLButtonElement).disabled).toBe(true)
  })

  it('can sync when only the package.json differs', async () => {
    expect.hasAssertions()
    const preview: MetadataPreview = { github: { description: 'Mine', homepage: '' }, local: { description: 'Old', homepage: '' }, ok: true, proposed: { description: 'Mine', homepage: '' } }
    stubApi({ preview: Response.json(preview) })
    renderApp(scanRequest(events), '/project/finga')
    fireEvent.click(await screen.findByTestId('action-sync-github-metadata'))
    await screen.findByTestId('sync-github-metadata-preview')
    expect((screen.getByTestId('sync-github-metadata-confirm') as HTMLButtonElement).disabled).toBe(false)
  })

  it('says why when the preview is refused', async () => {
    expect.hasAssertions()
    stubApi({ preview: Response.json({ ok: false, reason: 'the clone has no package.json' }) })
    renderApp(scanRequest(events), '/project/finga')
    fireEvent.click(await screen.findByTestId('action-sync-github-metadata'))
    const refused = await screen.findByTestId('sync-github-metadata-refused')
    expect(refused.textContent).toBe('the clone has no package.json')
  })

  it('says why when the server cannot be asked', async () => {
    expect.hasAssertions()
    stubApi({ preview: new Error('offline') })
    renderApp(scanRequest(events), '/project/finga')
    fireEvent.click(await screen.findByTestId('action-sync-github-metadata'))
    const refused = await screen.findByTestId('sync-github-metadata-refused')
    expect(refused.textContent).toBe('offline')
  })

  it('shows the reason when the sync is refused', async () => {
    expect.hasAssertions()
    const preview: MetadataPreview = { github: { description: '', homepage: '' }, local: { description: 'A game', homepage: '' }, ok: true, proposed: { description: 'A game', homepage: '' } }
    stubApi({ action: Response.json({ ok: false, reason: 'GitHub refused' }, { status: 409 }), preview: Response.json(preview) })
    renderApp(scanRequest(events), '/')
    fireEvent.click(await screen.findByTestId('actions-finga'))
    fireEvent.click(await screen.findByTestId('menu-sync-github-metadata'))
    await screen.findByTestId('sync-github-metadata-preview')
    fireEvent.click(screen.getByTestId('sync-github-metadata-confirm'))
    await waitFor(() => expect(screen.getByTestId('sync-github-metadata-error').textContent).toBe('GitHub refused'))
  })
})
