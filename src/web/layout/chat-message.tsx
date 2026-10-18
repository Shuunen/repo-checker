import type { ChatEvent } from '../../shared/claude.ts'

/**
 * One line of the conversation with Claude: what the user said, what Claude says, a tool it runs, a turn that failed, the end of the session
 * @param props the props
 * @param props.event the event
 * @returns the line, nothing for the end of a turn that went well
 */
export function ChatMessage({ event }: Readonly<{ event: ChatEvent }>) {
  if (event.type === 'user') return <p className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-lg bg-accent/15 px-3 py-2 text-sm">{event.text}</p>
  if (event.type === 'text') return <p className="max-w-[95%] whitespace-pre-wrap text-sm">{event.text}</p>
  if (event.type === 'tool') return <p className="truncate font-mono text-xs text-muted">{`▸ ${event.name} ${event.detail}`.trim()}</p>
  if (event.type === 'exit') return <p className="text-xs text-muted italic">{`Session ended: ${event.message}`}</p>
  return event.isError ? <p className="text-xs text-danger">Claude hit an error on this turn</p> : undefined
}
