import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aFinding, aProject, scanRequest, stubApi } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

/**
 * The scan events of one project
 * @param project the project and what it overrides
 * @param findings the findings of the project
 * @returns the events
 */
function eventsOf(project: Parameters<typeof aProject>[2] = {}, findings: Parameters<typeof aProject>[1] = []): ScanEvent[] {
  return [
    { target: '/projects', type: 'started' },
    { result: aProject('finga', findings, project), type: 'project' },
    { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
  ]
}

describe('archive', () => {
  it('has a long label in the menu of the list', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(eventsOf()), '/')
    fireEvent.click(await screen.findByTestId('actions-finga'))
    const item = await screen.findByTestId('menu-archive')
    expect(item.textContent).toBe('Archive on GitHub')
  })

  it('is offered once, not twice, when a finding offers it too', async () => {
    expect.hasAssertions()
    const idle = aFinding({ actions: ['archive'], message: 'no commit from you for 20 months', messageId: 'idle', ruleId: 'archive-candidate', scope: 'project', severity: 'info' })
    renderApp(scanRequest(eventsOf({}, [idle])), '/')
    fireEvent.click(await screen.findByTestId('actions-finga'))
    await expect(screen.findAllByTestId('menu-archive')).resolves.toHaveLength(1)
  })

  it('is offered once on the project page when a finding offers it too, and runs when confirmed', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ message: 'archived', ok: true }) })
    const idle = aFinding({ actions: ['archive'], message: 'no commit from you for 20 months', messageId: 'idle', ruleId: 'archive-candidate', scope: 'project', severity: 'info' })
    renderApp(scanRequest(eventsOf({}, [idle])), '/project/finga')
    await expect(screen.findAllByTestId('action-archive')).resolves.toHaveLength(1)
    fireEvent.click(await screen.findByTestId('action-archive'))
    fireEvent.click(await screen.findByTestId('archive-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/finga/archive', { headers: { 'x-repo-check': '1' }, method: 'POST' }))
  })

  it('archives from the menu of the list once confirmed, then scans only that project again', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ message: 'archived', ok: true }) })
    renderApp(scanRequest(eventsOf()), '/')
    fireEvent.click(await screen.findByTestId('actions-finga'))
    fireEvent.click(await screen.findByTestId('menu-archive'))
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByTestId('archive-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/finga/archive', { headers: { 'x-repo-check': '1' }, method: 'POST' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/finga/rescan'))
  })

  it('archives from the project page once confirmed, and does nothing on cancel', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ message: 'archived', ok: true }) })
    renderApp(scanRequest(eventsOf()), '/project/finga')
    fireEvent.click(await screen.findByTestId('action-archive'))
    fireEvent.click(await screen.findByTestId('archive-cancel'))
    await waitFor(() => expect(screen.queryByTestId('archive-dialog-body')).toBeNull())
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByTestId('action-archive'))
    fireEvent.click(await screen.findByTestId('archive-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/finga/archive', { headers: { 'x-repo-check': '1' }, method: 'POST' }))
  })

  it('shows the reason when the archive is refused', async () => {
    expect.hasAssertions()
    stubApi({ action: Response.json({ ok: false, reason: 'GitHub refused' }, { status: 409 }) })
    renderApp(scanRequest(eventsOf()), '/project/finga')
    fireEvent.click(await screen.findByTestId('action-archive'))
    fireEvent.click(await screen.findByTestId('archive-confirm'))
    await waitFor(() => expect(screen.getByTestId('archive-error').textContent).toBe('GitHub refused'))
  })

  it('is not offered for a project that is not on GitHub', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(eventsOf({ github: undefined })), '/project/finga')
    await screen.findByTestId('actions')
    expect(screen.queryByTestId('action-archive')).toBeNull()
  })

  it('is not offered for a repo that is already archived', async () => {
    expect.hasAssertions()
    const github = { ...aProject('finga').project.github, isArchived: true } as never
    renderApp(scanRequest(eventsOf({ github })), '/project/finga')
    await screen.findByTestId('action-delete-project')
    expect(screen.queryByTestId('action-archive')).toBeNull()
  })

  it('unarchives from the menu of the list once confirmed', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ message: 'unarchived', ok: true }) })
    const github = { ...aProject('finga').project.github, isArchived: true } as never
    renderApp(scanRequest(eventsOf({ github })), '/project/finga')
    fireEvent.click(await screen.findByTestId('action-unarchive'))
    fireEvent.click(await screen.findByTestId('unarchive-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/finga/unarchive', { headers: { 'x-repo-check': '1' }, method: 'POST' }))
  })

  it('has the long label in the menu of an archived project, and shows why it is refused', async () => {
    expect.hasAssertions()
    stubApi({ action: Response.json({ ok: false, reason: 'GitHub refused' }, { status: 409 }) })
    const github = { ...aProject('finga').project.github, isArchived: true } as never
    renderApp(scanRequest(eventsOf({ github })), '/')
    fireEvent.click(await screen.findByTestId('archived-toggle'))
    fireEvent.click(await screen.findByTestId('actions-finga'))
    const item = await screen.findByTestId('menu-unarchive')
    expect(item.textContent).toBe('Unarchive on GitHub')
    fireEvent.click(item)
    fireEvent.click(await screen.findByTestId('unarchive-confirm'))
    await waitFor(() => expect(screen.getByTestId('unarchive-error').textContent).toBe('GitHub refused'))
  })

  it('does not offer unarchive for a project that is not on GitHub or not archived', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(eventsOf({ github: undefined })), '/project/finga')
    await screen.findByTestId('actions')
    expect(screen.queryByTestId('action-unarchive')).toBeNull()
  })
})
