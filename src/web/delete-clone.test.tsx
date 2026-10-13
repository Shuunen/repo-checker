import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { DeletePreview } from '../shared/action.ts'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aFinding, aProject, scanRequest, stubApi } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

const safe = aFinding({ actions: ['delete-clone'], message: 'archived on GitHub, and the clone holds nothing that is not on GitHub', messageId: 'safe', ruleId: 'archived-clone', scope: 'project', severity: 'info' })
const events: ScanEvent[] = [
  { target: '/projects', type: 'started' },
  { result: aProject('old', [safe]), type: 'project' },
  { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
]
const preview = (ignoredFiles: string[] = ['.env']): DeletePreview => ({ ignoredFiles, ok: true, path: '/projects/old' })

/**
 * Open the project and the delete confirmation, once the server has answered the preview
 * @param request answers the scan request
 * @returns the scan request
 */
async function openConfirmation(request = scanRequest(events)) {
  renderApp(request, '/project/old')
  fireEvent.click(await screen.findByTestId('action-delete-clone'))
  await waitFor(() => expect(screen.queryByTestId('delete-checking')).toBeNull())
  return request
}

/**
 * Tell if the Delete button of the dialog is disabled
 * @returns true when it is
 */
function isDeleteDisabled() {
  return (screen.getByTestId('delete-confirm') as HTMLButtonElement).disabled
}

describe('delete clone', () => {
  it('checks again first, then says what would be lost and offers the delete', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: Response.json(preview(['.env', 'data/'])) })
    renderApp(scanRequest(events), '/project/old')
    fireEvent.click(await screen.findByTestId('action-delete-clone'))
    await screen.findByTestId('delete-checking')
    await screen.findByTestId('delete-preview')
    expect(screen.getByTestId('delete-preview').textContent).toBe('This deletes the folder /projects/old for good. Everything in it is on GitHub, except the files git ignores:.envdata/2 ignored files would be lost.')
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/old/delete-clone')
    expect(isDeleteDisabled()).toBe(false)
  })

  it('says when no ignored file would be lost', async () => {
    expect.hasAssertions()
    stubApi({ preview: Response.json(preview([])) })
    await openConfirmation()
    expect(screen.getByTestId('delete-preview').textContent).toContain('No ignored file would be lost.')
  })

  it('lists the first ignored files only, and counts them all', async () => {
    expect.hasAssertions()
    const manyFiles = Array.from({ length: 25 }, (_item, index) => `file-${index}`)
    stubApi({ preview: Response.json(preview(manyFiles)) })
    await openConfirmation()
    expect(screen.getByTestId('delete-preview').querySelectorAll('li')).toHaveLength(20)
    expect(screen.getByTestId('delete-preview').textContent).toContain('25 ignored files would be lost, the first 20 are listed.')
  })

  it.each([
    ['the reason the server refuses', Response.json({ ok: false, reason: 'owner/old: archived on GitHub, but the clone holds work that exists nowhere else: 1 unpushed commit' }, { status: 409 }), 'owner/old: archived on GitHub, but the clone holds work that exists nowhere else: 1 unpushed commit'],
    ['the status of an answer that is not json', new Response('oops', { status: 500 }), 'the server answered HTTP 500'],
    ['why the server could not be asked', new Error('Failed to fetch'), 'Failed to fetch'],
  ])('shows %s and cannot delete', async (_name, response, reason) => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: response })
    await openConfirmation()
    expect(screen.getByTestId('delete-refused').textContent).toBe(reason)
    expect(isDeleteDisabled()).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('closes without deleting on cancel, and checks again when opened again', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: Response.json(preview()) })
    await openConfirmation()
    fireEvent.click(screen.getByTestId('delete-cancel'))
    await waitFor(() => expect(screen.queryByTestId('delete-dialog-body')).toBeNull())
    fireEvent.click(screen.getByTestId('action-delete-clone'))
    await screen.findByTestId('delete-checking')
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('deletes when confirmed, with the action header, then scans only that project again', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: Response.json(preview()) })
    const request = await openConfirmation()
    fireEvent.click(screen.getByTestId('delete-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/old/rescan'))
    expect(request).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/old/delete-clone', { headers: { 'x-repo-check': '1' }, method: 'POST' })
    await waitFor(() => expect(screen.queryByTestId('delete-dialog-body')).toBeNull())
  })

  it('keeps the dialog open and shows why when the delete is refused at the last moment', async () => {
    expect.hasAssertions()
    const reason = 'owner/old: archived on GitHub, but the clone holds work that exists nowhere else: 1 changed file'
    const request = scanRequest(events)
    stubApi({ action: Response.json({ ok: false, reason }, { status: 409 }), preview: Response.json(preview()) })
    await openConfirmation(request)
    fireEvent.click(screen.getByTestId('delete-confirm'))
    const error = await screen.findByTestId('delete-error')
    expect(error.textContent).toBe(reason)
    expect(request).toHaveBeenCalledOnce()
  })
})
