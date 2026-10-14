import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aFinding, aProject, scanRequest, stubApi } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

const offPath = aFinding({ actions: ['checkout-default'], message: 'checked out on feat, the default branch is master', messageId: 'found', ruleId: 'not-on-default-branch', scope: 'project', severity: 'info' })
const events: ScanEvent[] = [
  { target: '/projects', type: 'started' },
  { result: aProject('finga', [offPath]), type: 'project' },
  { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
]

describe('checkout default branch', () => {
  it('has a short label on the list and a long one on the project page', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(events), '/')
    const button = await screen.findByTestId('action-checkout-default')
    expect(button.textContent).toBe('Master')
  })

  it('has the long label on the project page, and checks out once confirmed', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ message: 'checked out', ok: true }) })
    renderApp(scanRequest(events), '/project/finga')
    const button = await screen.findByTestId('action-checkout-default')
    expect(button.textContent).toBe('Checkout master branch')
    fireEvent.click(button)
    fireEvent.click(await screen.findByTestId('checkout-default-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/finga/checkout-default', { headers: { 'x-repo-check': '1' }, method: 'POST' }))
  })

  it('shows the reason when the checkout is refused', async () => {
    expect.hasAssertions()
    stubApi({ action: Response.json({ ok: false, reason: 'uncommitted files' }, { status: 409 }) })
    renderApp(scanRequest(events), '/')
    fireEvent.click(await screen.findByTestId('action-checkout-default'))
    fireEvent.click(await screen.findByTestId('checkout-default-confirm'))
    await waitFor(() => expect(screen.getByTestId('checkout-default-error').textContent).toBe('uncommitted files'))
  })

  it('falls back to a generic label for a project that is not on GitHub', async () => {
    expect.hasAssertions()
    renderApp(scanRequest([events[0] as ScanEvent, { result: aProject('finga', [offPath], { github: undefined }), type: 'project' }, events[2] as ScanEvent]), '/')
    const button = await screen.findByTestId('action-checkout-default')
    expect(button.textContent).toBe('Default')
  })
})
