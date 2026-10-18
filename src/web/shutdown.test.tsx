import { fireEvent, screen, waitFor } from '@testing-library/react'
import { aProject, scanRequest, stubApi } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

describe('shutdown', () => {
  it('asks the server to stop and says Stopped', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi()
    renderApp(
      scanRequest([
        { target: '/projects', type: 'started' },
        { result: aProject('finga'), type: 'project' },
        { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
      ]),
    )
    fireEvent.click(await screen.findByTestId('header-actions'))
    fireEvent.click(await screen.findByTestId('menu-shutdown'))
    await waitFor(() => expect(screen.getByTestId('header-actions').textContent).toBe('Stopped'))
    expect(fetchMock).toHaveBeenCalledWith('/api/shutdown', { headers: { 'x-repo-check': '1' }, method: 'POST' })
    expect((screen.getByTestId('header-actions') as HTMLButtonElement).disabled).toBe(true)
  })

  it('still says Stopped when the server is already gone', async () => {
    expect.hasAssertions()
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('gone')))
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
    renderApp(scanRequest([{ target: '/projects', type: 'started' }]))
    fireEvent.click(await screen.findByTestId('header-actions'))
    fireEvent.click(await screen.findByTestId('menu-shutdown'))
    await waitFor(() => expect(screen.getByTestId('header-actions').textContent).toBe('Stopped'))
  })
})
