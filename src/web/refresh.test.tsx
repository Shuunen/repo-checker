import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aFinding, aProject, scanRequest, stubApi } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

const notCloned = aFinding({ actions: ['clone'], message: 'on GitHub but not cloned', messageId: 'missing', ruleId: 'not-cloned', scope: 'project', severity: 'info' })
const pristine = aFinding({ actions: ['delete-fork'], ruleId: 'pristine-fork', scope: 'project', severity: 'info' })
const events: ScanEvent[] = [
  { target: '/projects', type: 'started' },
  { result: aProject('finga', [notCloned], { local: undefined }), type: 'project' },
  { result: aProject('qbt', [pristine]), type: 'project' },
  { result: aProject('other'), type: 'project' },
  { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
]

/**
 * Open a project, and confirm the action of its dialog
 * @param name the project name
 * @param actionTestId the test id of the action button
 * @param confirmTestId the test id of the confirm button
 * @returns the scan request
 */
async function runAction(name: string, actionTestId: string, confirmTestId: string) {
  const request = scanRequest(events)
  renderApp(request, `/project/${name}`)
  fireEvent.click(await screen.findByTestId(actionTestId))
  await screen.findByTestId(confirmTestId)
  await waitFor(() => expect((screen.getByTestId(confirmTestId) as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(screen.getByTestId(confirmTestId))
  return request
}

describe('after an action', () => {
  it('shows the project as it is now, in place, and keeps the other projects', async () => {
    expect.hasAssertions()
    const now = aProject('finga', [])
    stubApi({ rescan: Response.json({ ok: true, project: { ...now, project: { ...now.project, local: { ...now.project.local, currentBranch: 'cloned-branch' } } } }) })
    const request = await runAction('finga', 'action-clone', 'clone-confirm')
    await waitFor(() => expect(screen.queryByTestId('actions')).toBeNull())
    expect(screen.getByTestId('fact-branch').textContent).toBe('cloned-branch')
    expect(request).toHaveBeenCalledOnce()
  })

  it('removes the project when it is gone, a deleted fork', async () => {
    expect.hasAssertions()
    stubApi({ preview: Response.json({ branches: 1, clone: undefined, ok: true, parent: 'them/qbt' }), rescan: Response.json({ ok: true }) })
    const request = await runAction('qbt', 'action-delete-fork', 'fork-confirm')
    await waitFor(() => expect(screen.getByTestId('project-missing').textContent).toBe('No project named qbt in this scan'))
    expect(request).toHaveBeenCalledOnce()
  })

  it.each([
    ['refuses', Response.json({ ok: false, reason: 'the target is a single project' }, { status: 409 })],
    ['answers something that is not json', new Response('oops', { status: 500 })],
  ])('scans everything again when the server %s to scan the project alone', async (_name, rescan) => {
    expect.hasAssertions()
    stubApi({ rescan })
    const request = await runAction('finga', 'action-clone', 'clone-confirm')
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('scans everything again when the server cannot be asked for the project alone', async () => {
    expect.hasAssertions()
    stubApi({ rescan: new Error('Failed to fetch') })
    const request = await runAction('finga', 'action-clone', 'clone-confirm')
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
    expect(request).toHaveBeenCalledTimes(2)
  })
})
