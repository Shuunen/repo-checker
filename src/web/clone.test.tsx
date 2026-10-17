import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aFinding, aProject, scanRequest, stubApi } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

const notCloned = aFinding({ actions: ['clone'], message: 'on GitHub but not cloned in this folder', messageId: 'missing', ruleId: 'not-cloned', scope: 'project', severity: 'info' })
const events: ScanEvent[] = [
  { target: '/projects', type: 'started' },
  { result: aProject('finga', [notCloned], { local: undefined }), type: 'project' },
  { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
]

/**
 * Open the project and the clone confirmation
 * @param request answers the scan request
 * @returns the scan request
 */
async function openConfirmation(request = scanRequest(events)) {
  renderApp(request, '/project/finga')
  fireEvent.click(await screen.findByTestId('action-clone'))
  await screen.findByTestId('clone-dialog-body')
  return request
}

describe('clone', () => {
  it('asks for a confirmation that says what it will do, and does nothing before it', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ message: 'cloned', ok: true }) })
    await openConfirmation()
    expect(screen.getByTestId('clone-dialog-body').textContent).toBe('owner/finga is cloned over SSH into /projects/finga. Nothing that already exists is changed, and the clone is refused if a folder of that name appears before.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('closes without cloning on cancel', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ message: 'cloned', ok: true }) })
    await openConfirmation()
    fireEvent.click(screen.getByTestId('clone-cancel'))
    await waitFor(() => expect(screen.queryByTestId('clone-dialog-body')).toBeNull())
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('clones when confirmed, with the action header, then scans only that project again', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ message: 'cloned owner/finga into /projects/finga', ok: true }) })
    const request = await openConfirmation()
    fireEvent.click(screen.getByTestId('clone-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/finga/rescan'))
    expect(request).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/finga/clone', { headers: { 'x-repo-check': '1' }, method: 'POST' })
    await waitFor(() => expect(screen.queryByTestId('clone-dialog-body')).toBeNull())
  })

  it.each([
    ['the reason of a refusal', Response.json({ ok: false, reason: 'a folder named finga already exists in /projects' }, { status: 409 }), 'a folder named finga already exists in /projects'],
    ['the status of an answer that is not json', new Response('oops', { status: 500 }), 'the server answered HTTP 500'],
  ])('keeps the dialog open and shows %s', async (_name, response, reason) => {
    expect.hasAssertions()
    const request = scanRequest(events)
    stubApi({ action: response })
    await openConfirmation(request)
    fireEvent.click(screen.getByTestId('clone-confirm'))
    const error = await screen.findByTestId('clone-error')
    expect(error.textContent).toBe(reason)
    expect(request).toHaveBeenCalledOnce()
  })

  it('opens the confirmation right from the row of the list', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ message: 'cloned', ok: true }) })
    renderApp(scanRequest(events))
    const row = await screen.findByTestId('row-finga')
    fireEvent.click(within(row).getByTestId('actions-finga'))
    fireEvent.click(await screen.findByTestId('menu-clone'))
    await screen.findByTestId('clone-dialog-body')
    expect(screen.getByTestId('clone-dialog-body').textContent).toContain('owner/finga is cloned over SSH into /projects/finga')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(globalThis.location.pathname).toBe('/')
  })
})

describe('actions menu', () => {
  it('lists the actions of a row with their long label, and an item opens its confirmation', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(events))
    fireEvent.click(await screen.findByTestId('actions-finga'))
    const item = await screen.findByTestId('menu-clone')
    expect(item.textContent).toBe('Clone the repo')
    fireEvent.click(item)
    await screen.findByTestId('clone-dialog-body')
    fireEvent.click(screen.getByTestId('clone-cancel'))
    await waitFor(() => expect(screen.queryByTestId('clone-dialog-body')).toBeNull())
    fireEvent.click(screen.getByTestId('actions-finga'))
    fireEvent.click(await screen.findByTestId('menu-clone'))
    await screen.findByTestId('clone-dialog-body')
  })
})
