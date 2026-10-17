import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { DiscardPreview } from '../shared/action.ts'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aFinding, aProject, scanRequest, stubApi } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

const unsaved = aFinding({ actions: ['unarchive-push-rearchive', 'discard'], message: 'archived on GitHub, but the clone holds work', messageId: 'unsaved', ruleId: 'archived-with-unsaved-work', scope: 'project', severity: 'error' })
const events: ScanEvent[] = [
  { target: '/projects', type: 'started' },
  { result: aProject('old', [unsaved]), type: 'project' },
  { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
]
const preview: DiscardPreview = {
  fingerprint: 'abc123',
  groups: [
    { items: ['master: one more'], title: 'Unpushed commits' },
    { items: ['?? notes.txt'], title: 'Uncommitted files' },
  ],
  ok: true,
  path: '/projects/old',
}

/**
 * Open the project and the discard confirmation, once the server has answered the preview
 * @param request answers the scan request
 * @returns the scan request
 */
async function openConfirmation(request = scanRequest(events)) {
  renderApp(request, '/project/old')
  fireEvent.click(await screen.findByTestId('action-discard'))
  await waitFor(() => expect(screen.queryByTestId('discard-checking')).toBeNull())
  return request
}

/**
 * Tell if the Discard button of the dialog is disabled
 * @returns true when it is
 */
function isDiscardDisabled() {
  return (screen.getByTestId('discard-confirm') as HTMLButtonElement).disabled
}

describe('discard', () => {
  it('reads again first, then lists every item that would be thrown away', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: Response.json(preview) })
    renderApp(scanRequest(events), '/project/old')
    fireEvent.click(await screen.findByTestId('action-discard'))
    await screen.findByTestId('discard-checking')
    await screen.findByTestId('discard-preview')
    expect(screen.getByTestId('unsaved-list').textContent).toBe('Unpushed commitsmaster: one moreUncommitted files?? notes.txt')
    expect(screen.getByTestId('discard-preview').textContent).toContain('there is no undo. The files git ignores stay.')
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/old/discard')
    expect(isDiscardDisabled()).toBe(false)
  })

  it.each([
    ['the reason the server refuses', Response.json({ ok: false, reason: 'owner/old: archived on GitHub, and the clone holds nothing that is not on GitHub' }, { status: 409 }), 'owner/old: archived on GitHub, and the clone holds nothing that is not on GitHub'],
    ['the status of an answer that is not json', new Response('oops', { status: 500 }), 'the server answered HTTP 500'],
    ['why the server could not be asked', new Error('Failed to fetch'), 'Failed to fetch'],
  ])('shows %s and cannot discard', async (_name, response, reason) => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: response })
    await openConfirmation()
    expect(screen.getByTestId('discard-refused').textContent).toBe(reason)
    expect(isDiscardDisabled()).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('closes without discarding on cancel, and reads again when opened again', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: Response.json(preview) })
    await openConfirmation()
    fireEvent.click(screen.getByTestId('discard-cancel'))
    await waitFor(() => expect(screen.queryByTestId('discard-dialog-body')).toBeNull())
    fireEvent.click(screen.getByTestId('action-discard'))
    await screen.findByTestId('discard-checking')
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('discards when confirmed, with the fingerprint of the list shown and the action header, then scans only that project again', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: Response.json(preview) })
    const request = await openConfirmation()
    fireEvent.click(screen.getByTestId('discard-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/old/rescan'))
    expect(request).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/old/discard?fingerprint=abc123', { headers: { 'x-repo-check': '1' }, method: 'POST' })
    await waitFor(() => expect(screen.queryByTestId('discard-dialog-body')).toBeNull())
  })

  it('keeps the dialog open and shows why when the clone is not what was listed any more', async () => {
    expect.hasAssertions()
    const reason = 'the unsaved work of the clone is not what the dialog listed any more, nothing was discarded, open the dialog again'
    const request = scanRequest(events)
    stubApi({ action: Response.json({ ok: false, reason }, { status: 409 }), preview: Response.json(preview) })
    await openConfirmation(request)
    fireEvent.click(screen.getByTestId('discard-confirm'))
    const error = await screen.findByTestId('discard-error')
    expect(error.textContent).toBe(reason)
    expect(request).toHaveBeenCalledOnce()
  })
})
