import { fireEvent, screen, waitFor } from '@testing-library/react'
import { scanRequest } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

describe('restart', () => {
  it('asks the server to restart, waits until it answers again then reloads the page', async () => {
    expect.hasAssertions()
    const reload = vi.fn<() => void>()
    vi.stubGlobal('location', { hash: '', href: 'http://localhost:3000/', origin: 'http://localhost:3000', pathname: '/', reload, search: '' })
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ ok: true }))
      .mockRejectedValueOnce(new Error('gone'))
      .mockResolvedValueOnce(new Response('', { status: 502 }))
      .mockResolvedValue(new Response('page'))
    vi.stubGlobal('fetch', fetchMock)
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
    renderApp(scanRequest([{ isNitpick: false, target: '/projects', type: 'started' }]))
    fireEvent.click(await screen.findByTestId('header-actions'))
    fireEvent.click(await screen.findByTestId('menu-restart'))
    await waitFor(() => expect(screen.getByTestId('header-actions').textContent).toBe('Restarting…'))
    expect(fetchMock).toHaveBeenCalledWith('/api/restart', { headers: { 'x-repo-check': '1' }, method: 'POST' })
    await waitFor(() => expect(reload).toHaveBeenCalledOnce(), { timeout: 3000 })
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('keeps waiting when the server is already gone before it answers the restart', async () => {
    expect.hasAssertions()
    const reload = vi.fn<() => void>()
    vi.stubGlobal('location', { hash: '', href: 'http://localhost:3000/', origin: 'http://localhost:3000', pathname: '/', reload, search: '' })
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValueOnce(new Error('gone')).mockResolvedValue(new Response('page')))
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
    renderApp(scanRequest([{ isNitpick: false, target: '/projects', type: 'started' }]))
    fireEvent.click(await screen.findByTestId('header-actions'))
    fireEvent.click(await screen.findByTestId('menu-restart'))
    await waitFor(() => expect(reload).toHaveBeenCalledOnce(), { timeout: 3000 })
  })
})
