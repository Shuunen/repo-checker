import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { ChatEvent } from '../shared/claude.ts'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aProject, scanRequest, sseResponse, stubApi } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

const events = (project: Parameters<typeof aProject>[2] = {}): ScanEvent[] => [
  { isNitpick: false, target: '/projects', type: 'started' },
  { result: aProject('finga', [], project), type: 'project' },
  { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
]

const conversation: ChatEvent[] = [
  { text: '/update-project', type: 'user' },
  { text: 'Starting Phase 0', type: 'text' },
  { detail: 'git status', name: 'Bash', type: 'tool' },
  { isError: false, type: 'done' },
]

/**
 * Open the project page and the update modal
 * @param chat the events the server streams, none to leave the stream empty
 * @returns the fake fetch
 */
async function openUpdate(chat: readonly ChatEvent[] = conversation) {
  const fetchMock = stubApi({ preview: sseResponse(chat) })
  renderApp(scanRequest(events()), '/project/finga')
  fireEvent.click(await screen.findByTestId('action-update-project'))
  await screen.findByTestId('update-dialog-body')
  return fetchMock
}

/**
 * A fake server that answers one route with the given response and every other with a success
 * @param suffix the end of the url of the route
 * @param answer what the route answers, or the error when it cannot be reached
 * @returns the fake fetch
 */
function answerRoute(suffix: string, answer: Error | Response): typeof fetch {
  return url => {
    if (!String(url).endsWith(suffix)) return Promise.resolve(Response.json({ ok: true }))
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer)
  }
}

/**
 * A fake server whose stream of the conversation never ends and fails once the page stops following it, like a real fetch, and that answers every POST with a success
 * @returns the fake fetch
 */
function hangingStream(): typeof fetch {
  return (url, init) => {
    if (init?.method === 'POST' || !String(url).endsWith('/events')) return Promise.resolve(Response.json({ ok: true }))
    const body = new ReadableStream({
      start(controller) {
        init?.signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')))
      },
    })
    return Promise.resolve(new Response(body))
  }
}

const callsTo = (fetchMock: ReturnType<typeof stubApi>, suffix: string) => fetchMock.mock.calls.filter(([url]) => String(url).endsWith(suffix))

describe('update project', () => {
  it('starts Claude on the project and shows the conversation as it streams', async () => {
    expect.hasAssertions()
    const fetchMock = await openUpdate()
    await waitFor(() => expect(screen.getByTestId('update-transcript').textContent).toContain('Starting Phase 0'))
    expect(screen.getByTestId('update-transcript').textContent).toContain('/update-project')
    expect(screen.getByTestId('update-transcript').textContent).toContain('▸ Bash git status')
    expect(callsTo(fetchMock, '/update-project')[0]?.[1]).toStrictEqual({ headers: { 'x-repo-check': '1' }, method: 'POST' })
    expect(callsTo(fetchMock, '/update-project/events')).toHaveLength(1)
  })

  it('is offered in the menu of the list too', async () => {
    expect.hasAssertions()
    stubApi({ preview: sseResponse(conversation) })
    renderApp(scanRequest(events()), '/')
    fireEvent.click(await screen.findByTestId('actions-finga'))
    const item = await screen.findByTestId('menu-update-project')
    expect(item.textContent).toBe('Update project')
    fireEvent.click(item)
    await expect(screen.findByTestId('update-dialog-body')).resolves.toBeInstanceOf(HTMLElement)
  })

  it('is not offered for a project without usable clone', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(events({ local: undefined })), '/project/finga')
    await screen.findByTestId('actions')
    expect(screen.queryByTestId('action-update-project')).toBeNull()
  })

  it('says Claude is working until its turn is over', async () => {
    expect.hasAssertions()
    await openUpdate([{ text: 'Thinking', type: 'text' }])
    await expect(screen.findByTestId('update-working')).resolves.toBeInstanceOf(HTMLElement)
  })

  it('does not say Claude is working once its turn is over', async () => {
    expect.hasAssertions()
    await openUpdate()
    await waitFor(() => expect(screen.getByTestId('update-transcript').textContent).toContain('Starting Phase 0'))
    expect(screen.queryByTestId('update-working')).toBeNull()
  })

  it('sends the message with Enter and clears the input, Shift+Enter does not send', async () => {
    expect.hasAssertions()
    const fetchMock = await openUpdate()
    const input = await screen.findByTestId('update-input')
    fireEvent.change(input, { target: { value: 'option 1' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(callsTo(fetchMock, '/message')).toHaveLength(0)
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(callsTo(fetchMock, '/message')).toHaveLength(1))
    expect(callsTo(fetchMock, '/message')[0]?.[1]).toStrictEqual({ body: JSON.stringify({ text: 'option 1' }), headers: { 'x-repo-check': '1' }, method: 'POST' })
    expect((input as HTMLTextAreaElement).value).toBe('')
  })

  it('sends the message with the Send button, but not an empty one', async () => {
    expect.hasAssertions()
    const fetchMock = await openUpdate()
    const input = await screen.findByTestId('update-input')
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'a' })
    expect(callsTo(fetchMock, '/message')).toHaveLength(0)
    expect((screen.getByTestId('update-send') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(input, { target: { value: 'go on' } })
    fireEvent.click(screen.getByTestId('update-send'))
    await waitFor(() => expect(callsTo(fetchMock, '/message')).toHaveLength(1))
  })

  it('sends the number of a numbered line of Claude when it is clicked', async () => {
    expect.hasAssertions()
    const fetchMock = await openUpdate([
      { text: 'How to proceed?\n\n1. **Stop here**\n2. Run with bun', type: 'text' },
      { isError: false, type: 'done' },
    ])
    fireEvent.click(await screen.findByTestId('choice-2'))
    await waitFor(() => expect(callsTo(fetchMock, '/message')).toHaveLength(1))
    expect(callsTo(fetchMock, '/message')[0]?.[1]).toStrictEqual({ body: JSON.stringify({ text: '2' }), headers: { 'x-repo-check': '1' }, method: 'POST' })
  })

  it('does not offer the numbered lines once answered or while Claude is working', async () => {
    expect.hasAssertions()
    await openUpdate([
      { text: '1. one', type: 'text' },
      { text: '1', type: 'user' },
      { isError: false, type: 'done' },
    ])
    await waitFor(() => expect(screen.getByTestId('update-transcript').textContent).toContain('one'))
    expect(screen.queryByTestId('choice-1')).toBeNull()
  })

  it('renders the markdown of Claude', async () => {
    expect.hasAssertions()
    const text = '# Title\n\n## Sub\n\n### Subsub\n\n**bold** and `code` and [a link](https://example.com)\n\n- first\n- second\n\n```ts\nconst a = 1\n```\n\n3. third\n4. fourth'
    await openUpdate([
      { text, type: 'text' },
      { text: 'ok', type: 'user' },
      { isError: false, type: 'done' },
    ])
    const transcript = await screen.findByTestId('update-transcript')
    await waitFor(() => expect(transcript.querySelector('strong')?.textContent).toBe('bold'))
    expect(transcript.querySelector('h3')?.textContent).toBe('Title')
    expect(transcript.querySelector('a')?.getAttribute('href')).toBe('https://example.com')
    expect(transcript.querySelectorAll('li')).toHaveLength(4)
    expect(transcript.querySelector('pre code')?.textContent).toContain('const a = 1')
    expect(transcript.querySelector('p code')?.textContent).toBe('code')
  })

  it('gives a paragraph made of a single bold text the spacing of a title', async () => {
    expect.hasAssertions()
    await openUpdate([
      { text: '**Question: which one?**\n\nSome *detail*', type: 'text' },
      { text: 'ok', type: 'user' },
      { isError: false, type: 'done' },
    ])
    const title = await screen.findByText('Question: which one?')
    expect(title.closest('p')?.className).toContain('mt-5')
    expect(screen.getByText('detail').closest('p')?.className).not.toContain('mt-5')
  })

  it('numbers the clickable items from the start of the list', async () => {
    expect.hasAssertions()
    await openUpdate([
      { text: '3. third\n4. fourth', type: 'text' },
      { isError: false, type: 'done' },
    ])
    const choice = await screen.findByTestId('choice-4')
    expect(choice.textContent).toContain('fourth')
  })

  it('shows why a message was refused', async () => {
    expect.hasAssertions()
    const fetchMock = await openUpdate()
    fetchMock.mockImplementation(answerRoute('/message', Response.json({ ok: false, reason: 'there is no running Claude session for finga' }, { status: 409 })))
    fireEvent.change(await screen.findByTestId('update-input'), { target: { value: 'hello' } })
    fireEvent.click(screen.getByTestId('update-send'))
    await waitFor(() => expect(screen.getByTestId('update-error').textContent).toBe('there is no running Claude session for finga'))
  })

  it('closes only when the Close session button is pressed, stops Claude and scans the project again', async () => {
    expect.hasAssertions()
    const fetchMock = await openUpdate()
    fireEvent.keyDown(await screen.findByTestId('update-dialog-body'), { key: 'Escape' })
    expect(screen.getByTestId('update-dialog-body')).toBeInstanceOf(HTMLElement)
    fireEvent.click(screen.getByTestId('update-close'))
    await waitFor(() => expect(callsTo(fetchMock, '/update-project/close')).toHaveLength(1))
    await waitFor(() => expect(screen.queryByTestId('update-dialog-body')).toBeNull())
    await waitFor(() => expect(callsTo(fetchMock, '/rescan')).toHaveLength(1))
  })

  it('stays open with the reason when the server cannot close the session', async () => {
    expect.hasAssertions()
    const fetchMock = await openUpdate()
    fetchMock.mockImplementation(answerRoute('/close', new Error('offline')))
    fireEvent.click(await screen.findByTestId('update-close'))
    await waitFor(() => expect(screen.getByTestId('update-error').textContent).toBe('the server could not be asked to close the session'))
    expect(screen.getByTestId('update-dialog-body')).toBeInstanceOf(HTMLElement)
  })

  it('disables the input once the session ended, and says why', async () => {
    expect.hasAssertions()
    await openUpdate([...conversation, { message: 'claude stopped with code 1', type: 'exit' }])
    await waitFor(() => expect(screen.getByTestId('update-transcript').textContent).toContain('Session ended: claude stopped with code 1'))
    expect((screen.getByTestId('update-input') as HTMLTextAreaElement).disabled).toBe(true)
  })

  it('says when a turn failed', async () => {
    expect.hasAssertions()
    await openUpdate([{ isError: true, type: 'done' }])
    await waitFor(() => expect(screen.getByTestId('update-transcript').textContent).toContain('Claude hit an error on this turn'))
  })

  it('shows the reason when the session cannot start, and does not follow it', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ ok: false, reason: 'Claude is already updating finga, close that session first' }, { status: 409 }) })
    renderApp(scanRequest(events()), '/project/finga')
    fireEvent.click(await screen.findByTestId('action-update-project'))
    await waitFor(() => expect(screen.getByTestId('update-error').textContent).toBe('Claude is already updating finga, close that session first'))
    expect(callsTo(fetchMock, '/events')).toHaveLength(0)
  })

  it('says the connection was lost when the stream cannot be followed', async () => {
    expect.hasAssertions()
    stubApi({ preview: new Error('offline') })
    renderApp(scanRequest(events()), '/project/finga')
    fireEvent.click(await screen.findByTestId('action-update-project'))
    await waitFor(() => expect(screen.getByTestId('update-error').textContent).toBe('the connection with the server was lost'))
  })

  it('waits for the first event when the stream has no body', async () => {
    expect.hasAssertions()
    stubApi({ preview: new Response(undefined) })
    renderApp(scanRequest(events()), '/project/finga')
    fireEvent.click(await screen.findByTestId('action-update-project'))
    await expect(screen.findByText('Starting Claude…')).resolves.toBeInstanceOf(HTMLElement)
  })

  it('stops following when the session is closed, without saying the connection was lost', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi()
    fetchMock.mockImplementation(hangingStream())
    renderApp(scanRequest(events()), '/project/finga')
    fireEvent.click(await screen.findByTestId('action-update-project'))
    fireEvent.click(await screen.findByTestId('update-close'))
    await waitFor(() => expect(screen.queryByTestId('update-dialog-body')).toBeNull())
    expect(screen.queryByTestId('update-error')).toBeNull()
  })

  it('closes even when the session never started', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ ok: false, reason: 'no clone' }, { status: 409 }) })
    renderApp(scanRequest(events()), '/project/finga')
    fireEvent.click(await screen.findByTestId('action-update-project'))
    await waitFor(() => expect(screen.getByTestId('update-error').textContent).toBe('no clone'))
    fireEvent.click(screen.getByTestId('update-close'))
    await waitFor(() => expect(screen.queryByTestId('update-dialog-body')).toBeNull())
    expect(callsTo(fetchMock, '/update-project/close')).toHaveLength(1)
  })

  it('says what the server answered when it does not answer json', async () => {
    expect.hasAssertions()
    stubApi({ action: new Response('oops', { status: 500 }) })
    renderApp(scanRequest(events()), '/project/finga')
    fireEvent.click(await screen.findByTestId('action-update-project'))
    await waitFor(() => expect(screen.getByTestId('update-error').textContent).toBe('the server answered HTTP 500'))
  })
})
