import { toast } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import type { ActionResult } from '../../shared/action.ts'
import type { ChatEvent } from '../../shared/claude.ts'
import { refreshProject } from '../scan/refresh-project.ts'
import { readEvents } from '../scan/read-events.ts'

/**
 * Ask the server for something on the Claude session of a project, the `x-repo-check` header is required for anything that changes something
 * @param url the route
 * @param body what to send as JSON, nothing for a route that needs none
 * @returns the result, a failure to read the answer is a refusal with the HTTP status
 */
async function post(url: string, body?: object): Promise<ActionResult> {
  const response = await fetch(url, { headers: { 'x-repo-check': '1' }, method: 'POST', ...(body !== undefined && { body: JSON.stringify(body) }) })
  return response.json().catch((): ActionResult => ({ ok: false, reason: `the server answered HTTP ${response.status}` })) as Promise<ActionResult>
}

/**
 * Follow the conversation of a session as the server streams it
 * @param url the route of the stream
 * @param signal aborted to stop following
 * @param onEvent called with each event, in order
 */
async function followChat(url: string, signal: AbortSignal, onEvent: (event: ChatEvent) => void) {
  const response = await fetch(url, { signal })
  for await (const event of readEvents<ChatEvent>(response.body ?? new ReadableStream())) onEvent(event)
}

/**
 * The connection with the Claude session of a project: starting it, following its conversation and stopping to follow it
 * @param base the route of the session
 * @returns the conversation, the error, and how to start and stop
 */
function useChatConnection(base: string) {
  const [events, setEvents] = useState<ChatEvent[]>([])
  const [error, setError] = useState<string | undefined>()
  const stream = useRef<AbortController | undefined>(undefined)
  const start = async () => {
    setEvents([])
    setError(undefined)
    const started = await post(base)
    if (!started.ok) return setError(started.reason)
    const controller = new AbortController()
    stream.current = controller
    return followChat(`${base}/events`, controller.signal, event => setEvents(previous => [...previous, event])).catch(() => {
      if (!controller.signal.aborted) setError('the connection with the server was lost')
    })
  }
  return { error, events, setError, start, stop: () => stream.current?.abort() }
}

/**
 * The chat with Claude about a project: opening it starts Claude on the update skill in the clone and follows the conversation, messages are sent to the same session, and closing it stops Claude. The project is scanned again once it is closed, since Claude changed its files
 * @param name the repo name
 * @returns the conversation and what the dialog does
 * @example const chat = useUpdateChat('finga')
 */
export function useUpdateChat(name: string) {
  const client = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const base = `/api/projects/${encodeURIComponent(name)}/update-project`
  const { error, events, setError, start, stop } = useChatConnection(base)
  const last = events.at(-1)
  const handleOpen = () => {
    setIsOpen(true)
    return start()
  }
  const handleSend = async (text: string) => {
    const sent = await post(`${base}/message`, { text })
    if (!sent.ok) setError(sent.reason)
  }
  const handleClose = async () => {
    stop()
    try {
      await post(`${base}/close`)
    } catch {
      return setError('the server could not be asked to close the session')
    }
    setIsOpen(false)
    toast.success(`Closed the Claude session on ${name}`)
    return refreshProject(client, name)
  }
  return { error, events, handleClose, handleOpen, handleSend, isEnded: last?.type === 'exit', isOpen, isWorking: last !== undefined && last.type !== 'done' && last.type !== 'exit' }
}
