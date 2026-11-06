import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { ForkDeletePreview } from '../shared/action.ts'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aFinding, aProject, scanRequest, stubApi } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

const pristine = aFinding({ actions: ['delete-fork'], message: 'a pristine fork of them/qbt', messageId: 'pristine', ruleId: 'pristine-fork', scope: 'project', severity: 'info' })
const events: ScanEvent[] = [
  { isNitpick: false, target: '/projects', type: 'started' },
  { result: aProject('qbt', [pristine], { local: undefined }), type: 'project' },
  { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
]
const preview: ForkDeletePreview = { branches: 2, clone: undefined, ok: true, parent: 'them/qbt' }

/**
 * Open the project and the fork delete confirmation, once the server has answered the preview
 * @param request answers the scan request
 * @returns the scan request
 */
async function openConfirmation(request = scanRequest(events)) {
  renderApp(request, '/project/qbt')
  fireEvent.click(await screen.findByTestId('action-delete-fork'))
  await waitFor(() => expect(screen.queryByTestId('fork-checking')).toBeNull())
  return request
}

/**
 * Tell if the Delete button of the dialog is disabled
 * @returns true when it is
 */
function isDeleteDisabled() {
  return (screen.getByTestId('fork-confirm') as HTMLButtonElement).disabled
}

describe('delete fork', () => {
  it('checks again first, then says what is deleted and that it cannot be undone', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: Response.json(preview) })
    renderApp(scanRequest(events), '/project/qbt')
    fireEvent.click(await screen.findByTestId('action-delete-fork'))
    await screen.findByTestId('fork-checking')
    await screen.findByTestId('fork-preview')
    expect(screen.getByTestId('fork-preview').textContent).toBe('This deletes the fork owner/qbt on GitHub for good, it cannot be undone. 2 branches compared with them/qbt: none has a commit that them/qbt does not have, and no pull request is open.')
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/qbt/delete-fork')
    expect(isDeleteDisabled()).toBe(false)
  })

  it('says that the clean clone is deleted too, and lists the ignored files it holds', async () => {
    expect.hasAssertions()
    stubApi({ preview: Response.json({ ...preview, clone: { ignoredFiles: ['.env'], path: '/projects/qbt' } }) })
    await openConfirmation()
    expect(screen.getByTestId('fork-clone').textContent).toBe('Its clean local clone /projects/qbt is deleted too, with the files git ignores in it:')
    expect(screen.getByTestId('fork-preview').textContent).toContain('.env1 ignored file would be lost.')
  })

  it.each([
    ['the reason the server refuses', Response.json({ ok: false, reason: 'Owner/qbt: a fork of them/qbt with work to keep: patch-1 is 2 ahead' }, { status: 409 }), 'Owner/qbt: a fork of them/qbt with work to keep: patch-1 is 2 ahead'],
    ['the missing scope and how to add it', Response.json({ ok: false, reason: 'the gh token has no delete_repo scope, run: gh auth refresh -s delete_repo' }, { status: 409 }), 'the gh token has no delete_repo scope, run: gh auth refresh -s delete_repo'],
    ['the status of an answer that is not json', new Response('oops', { status: 500 }), 'the server answered HTTP 500'],
    ['why the server could not be asked', new Error('Failed to fetch'), 'Failed to fetch'],
  ])('shows %s and cannot delete', async (_name, response, reason) => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: response })
    await openConfirmation()
    expect(screen.getByTestId('fork-refused').textContent).toBe(reason)
    expect(isDeleteDisabled()).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('closes without deleting on cancel, and checks again when opened again', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: Response.json(preview) })
    await openConfirmation()
    fireEvent.click(screen.getByTestId('fork-cancel'))
    await waitFor(() => expect(screen.queryByTestId('fork-dialog-body')).toBeNull())
    fireEvent.click(screen.getByTestId('action-delete-fork'))
    await screen.findByTestId('fork-checking')
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('deletes when confirmed, with the action header, then scans only that project again', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: Response.json(preview) })
    const request = await openConfirmation()
    fireEvent.click(screen.getByTestId('fork-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/qbt/rescan'))
    expect(request).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/qbt/delete-fork', { headers: { 'x-repo-check': '1' }, method: 'POST' })
    await waitFor(() => expect(screen.queryByTestId('fork-dialog-body')).toBeNull())
  })

  it('keeps the dialog open and shows why when GitHub refuses at the last moment', async () => {
    expect.hasAssertions()
    const reason = 'GitHub refused to delete Owner/qbt: gh: Must have admin rights to Repository. (HTTP 403). If the token has no delete_repo scope, run: gh auth refresh -s delete_repo'
    const request = scanRequest(events)
    stubApi({ action: Response.json({ ok: false, reason }, { status: 409 }), preview: Response.json(preview) })
    await openConfirmation(request)
    fireEvent.click(screen.getByTestId('fork-confirm'))
    const error = await screen.findByTestId('fork-error')
    expect(error.textContent).toBe(reason)
    expect(request).toHaveBeenCalledOnce()
  })
})
