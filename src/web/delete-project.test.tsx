import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { ProjectDeletePreview } from '../shared/action.ts'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aProject, scanRequest, stubApi } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

const events: ScanEvent[] = [
  { target: '/projects', type: 'started' },
  { result: aProject('old', []), type: 'project' },
  { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
]
const preview: ProjectDeletePreview = { clone: { ignoredFiles: ['.env'], path: '/projects/old', unsaved: ['1 stash entry'] }, ok: true, repo: 'owner/old' }

describe('delete project', () => {
  it('opens from the Actions menu of the row and says what is lost for good', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: Response.json(preview) })
    renderApp(scanRequest(events), '/')
    fireEvent.click(await screen.findByTestId('actions-old'))
    fireEvent.click(await screen.findByTestId('menu-delete-project'))
    await screen.findByTestId('project-preview')
    expect(screen.getByTestId('project-repo').textContent).toContain('owner/old is deleted on GitHub for good')
    expect(screen.getByTestId('project-unsaved').textContent).toBe('It holds work that exists nowhere else: 1 stash entry.')
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/old/delete-project')
    expect((screen.getByTestId('project-confirm') as HTMLButtonElement).disabled).toBe(false)
  })

  it('keeps Delete disabled when the server refuses', async () => {
    expect.hasAssertions()
    stubApi({ preview: Response.json({ ok: false, reason: 'nothing to delete' }, { status: 409 }) })
    renderApp(scanRequest(events), '/')
    fireEvent.click(await screen.findByTestId('actions-old'))
    fireEvent.click(await screen.findByTestId('menu-delete-project'))
    await waitFor(() => expect(screen.getByTestId('project-refused').textContent).toBe('nothing to delete'))
    expect((screen.getByTestId('project-confirm') as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows why the server could not be asked', async () => {
    expect.hasAssertions()
    stubApi({ preview: new Error('server down') })
    renderApp(scanRequest(events), '/')
    fireEvent.click(await screen.findByTestId('actions-old'))
    fireEvent.click(await screen.findByTestId('menu-delete-project'))
    await waitFor(() => expect(screen.getByTestId('project-refused').textContent).toBe('server down'))
  })

  it('says only what exists: a repo that is not cloned, a clone that is not on GitHub', async () => {
    expect.hasAssertions()
    stubApi({ preview: Response.json({ clone: undefined, ok: true, repo: 'owner/old' }) })
    renderApp(scanRequest(events), '/')
    fireEvent.click(await screen.findByTestId('actions-old'))
    fireEvent.click(await screen.findByTestId('menu-delete-project'))
    await screen.findByTestId('project-repo')
    expect(screen.queryByTestId('project-clone')).toBeNull()
  })

  it('does not mention unsaved work or a repo when there is none', async () => {
    expect.hasAssertions()
    stubApi({ preview: Response.json({ clone: { ignoredFiles: [], path: '/projects/old', unsaved: [] }, ok: true }) })
    renderApp(scanRequest(events), '/')
    fireEvent.click(await screen.findByTestId('actions-old'))
    fireEvent.click(await screen.findByTestId('menu-delete-project'))
    await screen.findByTestId('project-clone')
    expect(screen.queryByTestId('project-repo')).toBeNull()
    expect(screen.queryByTestId('project-unsaved')).toBeNull()
  })

  it('shows the reason when the delete is refused after it was confirmed', async () => {
    expect.hasAssertions()
    stubApi({ action: Response.json({ ok: false, reason: 'GitHub refused' }, { status: 409 }), preview: Response.json(preview) })
    renderApp(scanRequest(events), '/')
    fireEvent.click(await screen.findByTestId('actions-old'))
    fireEvent.click(await screen.findByTestId('menu-delete-project'))
    await screen.findByTestId('project-preview')
    fireEvent.click(screen.getByTestId('project-confirm'))
    await waitFor(() => expect(screen.getByTestId('project-error').textContent).toBe('GitHub refused'))
  })

  it('goes back to the list once the project is deleted', async () => {
    expect.hasAssertions()
    stubApi({ preview: Response.json(preview) })
    renderApp(scanRequest(events), '/project/old')
    fireEvent.click(await screen.findByTestId('action-delete-project'))
    await screen.findByTestId('project-preview')
    fireEvent.click(screen.getByTestId('project-confirm'))
    await waitFor(() => expect(globalThis.location.pathname).toBe('/'))
  })
})
