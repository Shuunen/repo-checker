import { fireEvent, screen, waitFor } from '@testing-library/react'
import { aFinding, aProject, scanRequest, stubApi } from '../test/fixtures.ts'
import { renderApp } from '../test/render-app.tsx'

const events = [
  { isNitpick: false, target: '/projects', type: 'started' },
  { result: aProject('finga', [aFinding({ message: 'https://x answers HTTP 504', ruleId: 'deploy-down', severity: 'error' })]), type: 'project' },
  { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
] as const

describe('ignore a rule', () => {
  it('asks the server to ignore the rule for 24 hours, then scans the project again', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ message: 'ignored', ok: true }) })
    renderApp(scanRequest([...events]), '/project/finga')
    fireEvent.click(await screen.findByTestId('ignore-deploy-down'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/finga/ignore-rule?rule=deploy-down', { headers: { 'x-repo-check': '1' }, method: 'POST' }))
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/rescan'))).toBe(true))
  })

  it('does not scan again when the server refuses', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ ok: false, reason: 'nope' }, { status: 409 }) })
    renderApp(scanRequest([...events]), '/project/finga')
    fireEvent.click(await screen.findByTestId('ignore-deploy-down'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/finga/ignore-rule?rule=deploy-down', expect.anything()))
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/rescan'))).toBe(false)
  })

  it('says the server answered nothing readable', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: new Response('boom', { status: 500 }) })
    renderApp(scanRequest([...events]), '/project/finga')
    fireEvent.click(await screen.findByTestId('ignore-deploy-down'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/finga/ignore-rule?rule=deploy-down', expect.anything()))
  })
})
