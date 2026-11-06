import type { ChatEvent } from '../../shared/claude.ts'
import { type ClaudeProcess, createClaudeSessions, type ProcessHandlers, type SpawnClaude } from './claude-session.ts'

/**
 * A fake claude that records what it receives and lets the test make it speak and stop
 * @returns the spawn, the processes it started and their handlers
 */
function fakeClaude() {
  const started: { cwd: string; handlers: ProcessHandlers; process: ClaudeProcess & { lines: string[]; isKilled: boolean } }[] = []
  const spawn = vi.fn<SpawnClaude>((cwd, handlers) => {
    const process = {
      isKilled: false,
      kill() {
        process.isKilled = true
      },
      lines: [] as string[],
      write: (line: string) => void process.lines.push(line),
    }
    started.push({ cwd, handlers, process })
    return process
  })
  return { spawn, started }
}

const assistantText = (text: string) => JSON.stringify({ message: { content: [{ text, type: 'text' }] }, type: 'assistant' })

describe(createClaudeSessions, () => {
  it('starts Claude in the clone and sends it the update skill', () => {
    expect.hasAssertions()
    const { spawn, started } = fakeClaude()
    const result = createClaudeSessions(spawn).start('finga', '/projects/finga')
    expect(result).toStrictEqual({ message: 'started Claude on /projects/finga', ok: true })
    expect(started[0]?.cwd).toBe('/projects/finga')
    expect(started[0]?.process.lines).toStrictEqual(['{"message":{"content":"/update-project","role":"user"},"type":"user"}\n'])
  })

  it('tells the followers what Claude says, what the user says and when a turn is over', () => {
    expect.hasAssertions()
    const { spawn, started } = fakeClaude()
    const sessions = createClaudeSessions(spawn)
    sessions.start('finga', '/projects/finga')
    const seen: ChatEvent[] = []
    sessions.watch('finga', event => seen.push(event))
    started[0]?.handlers.onLine(assistantText('hello'))
    started[0]?.handlers.onLine('{"type":"result"}')
    expect(sessions.send('finga', 'go on')).toStrictEqual({ message: 'sent', ok: true })
    expect(seen.map(event => event.type)).toStrictEqual(['user', 'text', 'done', 'user'])
    expect(started[0]?.process.lines.at(-1)).toBe('{"message":{"content":"go on","role":"user"},"type":"user"}\n')
  })

  it('replays the conversation to a follower that comes late, and stops following on request', () => {
    expect.hasAssertions()
    const { spawn, started } = fakeClaude()
    const sessions = createClaudeSessions(spawn)
    sessions.start('finga', '/projects/finga')
    started[0]?.handlers.onLine(assistantText('hello'))
    const seen: ChatEvent[] = []
    const unwatch = sessions.watch('finga', event => seen.push(event))
    expect(seen.map(event => event.type)).toStrictEqual(['user', 'text'])
    unwatch?.()
    started[0]?.handlers.onLine(assistantText('again'))
    expect(seen).toHaveLength(2)
  })

  it('has nothing to follow without a session', () => {
    expect.hasAssertions()
    expect(createClaudeSessions(fakeClaude().spawn).watch('finga', vi.fn<() => void>())).toBeUndefined()
  })

  it('refuses a second session while one runs, but starts again once it ended', () => {
    expect.hasAssertions()
    const { spawn, started } = fakeClaude()
    const sessions = createClaudeSessions(spawn)
    sessions.start('finga', '/projects/finga')
    expect(sessions.start('finga', '/projects/finga')).toStrictEqual({ ok: false, reason: 'Claude is already updating finga, close that session first' })
    started[0]?.handlers.onExit('claude stopped with code 1')
    expect(sessions.start('finga', '/projects/finga').ok).toBe(true)
    expect(spawn).toHaveBeenCalledTimes(2)
  })

  it('ends the session when Claude stops, once, and sends nothing more', () => {
    expect.hasAssertions()
    const { spawn, started } = fakeClaude()
    const sessions = createClaudeSessions(spawn)
    sessions.start('finga', '/projects/finga')
    const seen: ChatEvent[] = []
    sessions.watch('finga', event => seen.push(event))
    started[0]?.handlers.onExit('claude stopped with code 0')
    started[0]?.handlers.onExit('claude stopped')
    expect(seen.slice(-1)).toStrictEqual([{ message: 'claude stopped with code 0', type: 'exit' }])
    expect(seen.filter(event => event.type === 'exit')).toHaveLength(1)
    expect(sessions.send('finga', 'hello')).toStrictEqual({ ok: false, reason: 'there is no running Claude session for finga' })
  })

  it.each([
    { name: 'nope', reason: 'there is no running Claude session for nope', text: 'hello', title: 'there is no session' },
    { name: 'finga', reason: 'the message is empty', text: '  ', title: 'the message is empty' },
  ])('refuses a message when $title', ({ name, reason, text }) => {
    expect.hasAssertions()
    const sessions = createClaudeSessions(fakeClaude().spawn)
    sessions.start('finga', '/projects/finga')
    expect(sessions.send(name, text)).toStrictEqual({ ok: false, reason })
  })

  it('closes a session: Claude is stopped, the followers are told, and it is forgotten', () => {
    expect.hasAssertions()
    const { spawn, started } = fakeClaude()
    const sessions = createClaudeSessions(spawn)
    sessions.start('finga', '/projects/finga')
    const seen: ChatEvent[] = []
    sessions.watch('finga', event => seen.push(event))
    expect(sessions.close('finga')).toStrictEqual({ message: 'closed', ok: true })
    expect(started[0]?.process.isKilled).toBe(true)
    expect(seen.slice(-1)).toStrictEqual([{ message: 'closed', type: 'exit' }])
    expect(sessions.watch('finga', vi.fn<() => void>())).toBeUndefined()
    expect(sessions.close('finga')).toStrictEqual({ message: 'closed', ok: true })
  })

  it('closes every session when the server stops', () => {
    expect.hasAssertions()
    const { spawn, started } = fakeClaude()
    const sessions = createClaudeSessions(spawn)
    sessions.start('finga', '/projects/finga')
    sessions.start('ging', '/projects/ging')
    sessions.closeAll()
    expect(started.map(item => item.process.isKilled)).toStrictEqual([true, true])
  })
})
