import type { ChatEvent } from '../shared/claude.ts'
import type { Actions } from './actions/actions-contract.ts'
import { app, worksFine } from './app-fixtures.ts'
import type { ScanRunner } from './stream-scan.ts'

const post = { headers: { 'x-repo-check': '1' }, method: 'POST' }
const url = 'http://127.0.0.1/api/projects/finga/update-project'

/**
 * The app with some actions replaced
 * @param actions the actions to replace
 * @returns the app
 */
function appWith(actions: Partial<Actions>) {
  return app(vi.fn<ScanRunner>(), import.meta.dirname, { ...worksFine, ...actions })
}

describe('update with Claude', () => {
  it('starts the session of the project and answers its result', async () => {
    expect.hasAssertions()
    const startUpdateProject = vi.fn<Actions['startUpdateProject']>(() => Promise.resolve({ message: 'started', ok: true }))
    const response = await appWith({ startUpdateProject }).request(url, post)
    expect(response.status).toBe(200)
    expect(startUpdateProject).toHaveBeenCalledWith('finga')
  })

  it('answers 409 with the reason when it cannot start', async () => {
    expect.hasAssertions()
    const response = await appWith({ startUpdateProject: () => Promise.resolve({ ok: false, reason: 'already updating' }) }).request(url, post)
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toStrictEqual({ ok: false, reason: 'already updating' })
  })

  it('streams the conversation as server-sent events until the session ends, then stops following', async () => {
    expect.hasAssertions()
    const unwatch = vi.fn<() => void>()
    const watchUpdateProject: Actions['watchUpdateProject'] = (_name, listener) => {
      const events: ChatEvent[] = [
        { text: '/update-project', type: 'user' },
        { text: 'hello', type: 'text' },
        { message: 'closed', type: 'exit' },
      ]
      for (const event of events) listener(event)
      return unwatch
    }
    const response = await appWith({ watchUpdateProject }).request(`${url}/events`)
    const text = await response.text()
    expect(text).toMatch(/event: user\ndata: \{"text":"\/update-project","type":"user"\}\n\nevent: text\ndata: \{"text":"hello","type":"text"\}\n\nevent: exit\ndata: \{"message":"closed","type":"exit"\}\n\n/u)
    expect(unwatch).toHaveBeenCalledWith()
  })

  it('says there is no session instead of waiting for one', async () => {
    expect.hasAssertions()
    const response = await appWith({ watchUpdateProject: () => undefined }).request(`${url}/events`)
    await expect(response.text()).resolves.toContain('event: exit')
  })

  it('stops following when the page goes away', async () => {
    expect.hasAssertions()
    const unwatch = vi.fn<() => void>()
    const response = await appWith({ watchUpdateProject: () => unwatch }).request(`${url}/events`)
    await response.body?.cancel()
    await vi.waitFor(() => expect(unwatch).toHaveBeenCalledWith())
  })

  it('sends a message of the user to the session', async () => {
    expect.hasAssertions()
    const sendUpdateMessage = vi.fn<Actions['sendUpdateMessage']>(() => Promise.resolve({ message: 'sent', ok: true }))
    const response = await appWith({ sendUpdateMessage }).request(`${url}/message`, { ...post, body: JSON.stringify({ text: 'go on' }) })
    expect(response.status).toBe(200)
    expect(sendUpdateMessage).toHaveBeenCalledWith('finga', 'go on')
  })

  it('refuses a message that is missing', async () => {
    expect.hasAssertions()
    const sendUpdateMessage = vi.fn<Actions['sendUpdateMessage']>()
    const response = await appWith({ sendUpdateMessage }).request(`${url}/message`, post)
    expect(response.status).toBe(409)
    expect(sendUpdateMessage).not.toHaveBeenCalled()
  })

  it('refuses a message that is not text', async () => {
    expect.hasAssertions()
    const sendUpdateMessage = vi.fn<Actions['sendUpdateMessage']>()
    const response = await appWith({ sendUpdateMessage }).request(`${url}/message`, { ...post, body: JSON.stringify({ text: 3 }) })
    expect(response.status).toBe(409)
    expect(sendUpdateMessage).not.toHaveBeenCalled()
  })

  it('closes the session', async () => {
    expect.hasAssertions()
    const closeUpdateProject = vi.fn<Actions['closeUpdateProject']>(() => Promise.resolve({ message: 'closed', ok: true }))
    const response = await appWith({ closeUpdateProject }).request(`${url}/close`, post)
    expect(response.status).toBe(200)
    expect(closeUpdateProject).toHaveBeenCalledWith('finga')
  })
})
