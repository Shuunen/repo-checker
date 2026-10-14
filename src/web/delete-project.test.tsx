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
  it('opens from the trash icon of the row and says what is lost for good', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: Response.json(preview) })
    renderApp(scanRequest(events), '/')
    fireEvent.click(await screen.findByTestId('action-delete-project'))
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
    fireEvent.click(await screen.findByTestId('action-delete-project'))
    await waitFor(() => expect(screen.getByTestId('project-refused').textContent).toBe('nothing to delete'))
    expect((screen.getByTestId('project-confirm') as HTMLButtonElement).disabled).toBe(true)
  })
})
