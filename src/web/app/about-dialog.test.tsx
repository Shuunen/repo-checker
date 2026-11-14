import { fireEvent, screen, waitFor } from '@testing-library/react'
import { scanRequest } from '../test/fixtures.ts'
import { renderApp } from '../test/render-app.tsx'

describe('about', () => {
  it('opens the about dialog with the unique mark placeholder from the actions menu, and closes it', async () => {
    expect.hasAssertions()
    renderApp(scanRequest([{ isNitpick: false, target: '/projects', type: 'started' }]))
    fireEvent.click(await screen.findByTestId('header-actions'))
    fireEvent.click(await screen.findByTestId('menu-about'))
    const body = await screen.findByTestId('about-body')
    expect(body.textContent).toContain('github.com/Shuunen/repo-checker')
    expect(screen.getByTestId('about-mark').id).toBe('unique-mark')
    fireEvent.click(screen.getByTestId('about-close'))
    await waitFor(() => expect(screen.queryByTestId('about-body')).toBeNull())
  })
})
