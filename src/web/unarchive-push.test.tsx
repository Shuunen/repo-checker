import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { LocalClone } from '../shared/project.ts'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aFinding, aProject, scanRequest } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

const unsaved = aFinding({ actions: ['unarchive-push-rearchive', 'discard'], message: 'archived on GitHub, but the clone holds work', messageId: 'unsaved', ruleId: 'archived-with-unsaved-work', scope: 'project', severity: 'error' })
const base = aProject('old').project

/**
 * The scan events of an archived repo whose clone holds the given work
 * @param local what the clone holds
 * @returns the events
 */
function eventsWith(local: Readonly<Partial<LocalClone>>): ScanEvent[] {
  const result = aProject('old', [unsaved], { github: { ...base.github, isArchived: true } as never, local: { ...base.local, localOnlyBranches: ['wip'], unpushed: [{ branch: 'master', subjects: ['one more'] }], ...local } as never })
  return [
    { target: '/projects', type: 'started' },
    { result, type: 'project' },
    { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
  ]
}

/**
 * Replace fetch with a fake that answers the action request, put the real one back when the test ends
 * @param response what the server answers
 * @returns the fake
 */
function stubAction(response: Response) {
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(response))
  vi.stubGlobal('fetch', fetchMock)
  onTestFinished(() => {
    vi.unstubAllGlobals()
  })
  return fetchMock
}

/**
 * Open the project and the confirmation
 * @param request answers the scan request
 * @returns the scan request
 */
async function openConfirmation(request: ReturnType<typeof scanRequest>) {
  renderApp(request, '/project/old')
  fireEvent.click(await screen.findByTestId('action-unarchive-push-rearchive'))
  await screen.findByTestId('unarchive-dialog-body')
  return request
}

/**
 * Tell if the confirm button is disabled
 * @returns true when it is
 */
function isConfirmDisabled() {
  return (screen.getByTestId('unarchive-confirm') as HTMLButtonElement).disabled
}

describe('unarchive and push', () => {
  it('lists exactly what is saved, and nothing runs before the confirmation', async () => {
    expect.hasAssertions()
    const fetchMock = stubAction(Response.json({ message: 'pushed', ok: true }))
    await openConfirmation(scanRequest(eventsWith({})))
    expect(screen.getByTestId('unsaved-list').textContent).toBe('Unpushed commitsmaster: one moreLocal-only brancheswip')
    expect(screen.queryByTestId('unarchive-blocker')).toBeNull()
    expect(isConfirmDisabled()).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('runs when confirmed, with the action header, then scans again', async () => {
    expect.hasAssertions()
    const fetchMock = stubAction(Response.json({ message: 'pushed 2 branches', ok: true }))
    const request = await openConfirmation(scanRequest(eventsWith({})))
    fireEvent.click(screen.getByTestId('unarchive-confirm'))
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/old/unarchive-push', { headers: { 'x-repo-check': '1' }, method: 'POST' })
    await waitFor(() => expect(screen.queryByTestId('unarchive-dialog-body')).toBeNull())
  })

  it('closes without running on cancel', async () => {
    expect.hasAssertions()
    const fetchMock = stubAction(Response.json({ message: 'pushed', ok: true }))
    await openConfirmation(scanRequest(eventsWith({})))
    fireEvent.click(screen.getByTestId('unarchive-cancel'))
    await waitFor(() => expect(screen.queryByTestId('unarchive-dialog-body')).toBeNull())
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['uncommitted files', { changedFiles: ['?? notes.txt'] }, 'The clone has 1 uncommitted file.'],
    ['a stash', { stashes: ['stash@{0}: WIP'] }, 'The clone has 1 stash.'],
  ])('says why it cannot run, and disables the button, while the clone has %s', async (_name, local, reason) => {
    expect.hasAssertions()
    stubAction(Response.json({ message: 'pushed', ok: true }))
    await openConfirmation(scanRequest(eventsWith(local)))
    expect(screen.getByTestId('unarchive-blocker').textContent).toContain(reason)
    expect(isConfirmDisabled()).toBe(true)
  })

  it('keeps the dialog open and shows why when the server refuses', async () => {
    expect.hasAssertions()
    const request = scanRequest(eventsWith({}))
    stubAction(Response.json({ ok: false, reason: 'git push failed: rejected. Shuunen/old is archived again, nothing was pushed' }, { status: 409 }))
    await openConfirmation(request)
    fireEvent.click(screen.getByTestId('unarchive-confirm'))
    const error = await screen.findByTestId('unarchive-error')
    expect(error.textContent).toBe('git push failed: rejected. Shuunen/old is archived again, nothing was pushed')
    expect(request).toHaveBeenCalledOnce()
  })
})
