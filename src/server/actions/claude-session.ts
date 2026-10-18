import type { ActionResult } from '../../shared/action.ts'
import type { ChatEvent } from '../../shared/claude.ts'
import { parseLine } from './claude-events.ts'

/** A running `claude`, as the sessions use it */
export interface ClaudeProcess {
  /** Stop it now */
  kill: () => void
  /** Send it one line on its standard input */
  write: (line: string) => void
}

/** What a running `claude` tells */
export interface ProcessHandlers {
  /** It stopped, or never started, with what to tell the user. It may be called twice */
  onExit: (message: string) => void
  /** It printed one line */
  onLine: (line: string) => void
}

/** Start `claude` in a folder, replaced by a fake in tests */
export type SpawnClaude = (cwd: string, handlers: Readonly<ProcessHandlers>) => ClaudeProcess

/** Called with each event of a session */
export type ChatListener = (event: ChatEvent) => void

/** One conversation with Claude about one project */
interface Session {
  /** Everything said so far, so a page that connects late sees the whole conversation */
  events: ChatEvent[]
  /** True once the session is over */
  isEnded: boolean
  /** Who follows the session */
  listeners: Set<ChatListener>
  /** The running claude */
  process: ClaudeProcess
}

/** The sessions of a server, by project name */
type Sessions = Map<string, Session>

/** What the first message of an update session is: the skill that does the update */
const firstMessage = '/update-project'

/**
 * Add an event to a session and tell the ones that follow it
 * @param session the session
 * @param event the event
 */
function emit(session: Session, event: ChatEvent) {
  session.events.push(event)
  for (const listener of session.listeners) listener(event)
}

/**
 * End a session: nothing more is said or sent, and the last event tells why
 * @param session the session
 * @param message why it ended
 */
function end(session: Session, message: string) {
  if (session.isEnded) return
  session.isEnded = true
  emit(session, { message, type: 'exit' })
}

/**
 * Send a message of the user to Claude, as one line of the stream-json input
 * @param session the session
 * @param text the message
 */
function say(session: Session, text: string) {
  session.process.write(`${JSON.stringify({ message: { content: text, role: 'user' }, type: 'user' })}\n`)
  emit(session, { text, type: 'user' })
}

/**
 * Start Claude on the update skill in a folder, refused while the project already has a session that runs
 * @param sessions the sessions
 * @param spawn starts `claude` in a folder
 * @param project the project to update
 * @param project.cwd the folder of the clone
 * @param project.name the project name
 * @returns the result
 */
function start(sessions: Sessions, spawn: SpawnClaude, { cwd, name }: Readonly<{ cwd: string; name: string }>): ActionResult {
  if (sessions.get(name)?.isEnded === false) return { ok: false, reason: `Claude is already updating ${name}, close that session first` }
  // the process is started right below, it needs the session for its handlers
  const session = { events: [], isEnded: false, listeners: new Set() } as unknown as Session
  const onLine = (line: string) => {
    for (const event of parseLine(line)) emit(session, event)
  }
  session.process = spawn(cwd, { onExit: message => end(session, message), onLine })
  sessions.set(name, session)
  say(session, firstMessage)
  return { message: `started Claude on ${cwd}`, ok: true }
}

/**
 * Send a message of the user to the session of a project
 * @param sessions the sessions
 * @param name the project name
 * @param text the message
 * @returns the result, refused when there is no session that runs or the message is empty
 */
function send(sessions: Sessions, name: string, text: string): ActionResult {
  const session = sessions.get(name)
  if (session === undefined || session.isEnded) return { ok: false, reason: `there is no running Claude session for ${name}` }
  if (text.trim() === '') return { ok: false, reason: 'the message is empty' }
  say(session, text)
  return { message: 'sent', ok: true }
}

/**
 * Close the session of a project: Claude is stopped, the ones that follow it are told, and it is forgotten
 * @param sessions the sessions
 * @param name the project name
 * @returns the result, it works whether the session still ran or not
 */
function close(sessions: Sessions, name: string): ActionResult {
  const session = sessions.get(name)
  if (session !== undefined) {
    session.process.kill()
    end(session, 'closed')
    sessions.delete(name)
  }
  return { message: 'closed', ok: true }
}

/**
 * Follow the session of a project: the conversation so far is replayed to the listener, then each new event
 * @param sessions the sessions
 * @param name the project name
 * @param listener called with each event
 * @returns a function that stops following, undefined when the project has no session
 */
function watch(sessions: Sessions, name: string, listener: ChatListener) {
  const session = sessions.get(name)
  if (session === undefined) return undefined
  for (const event of session.events) listener(event)
  session.listeners.add(listener)
  return () => void session.listeners.delete(listener)
}

/**
 * The conversations with Claude of a server, one per project: each one runs `claude` in the clone of the project, which stays alive between the messages until it is closed
 * @param spawn starts `claude` in a folder
 * @returns the sessions
 * @example const sessions = createClaudeSessions(spawnClaude)
 */
export function createClaudeSessions(spawn: SpawnClaude) {
  const sessions: Sessions = new Map()
  return {
    close: (name: string) => close(sessions, name),
    closeAll() {
      for (const name of sessions.keys()) close(sessions, name)
    },
    send: (name: string, text: string) => send(sessions, name, text),
    start: (name: string, cwd: string) => start(sessions, spawn, { cwd, name }),
    watch: (name: string, listener: ChatListener) => watch(sessions, name, listener),
  }
}

/** The sessions of a server */
export type ClaudeSessions = ReturnType<typeof createClaudeSessions>
