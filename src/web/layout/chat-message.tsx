import type { ChatEvent } from '../../shared/claude.ts'
import { ClaudeText } from './claude-text.tsx'

/** What `ChatMessage` shows and does */
interface ChatMessageProps {
  /** The event */
  event: ChatEvent
  /** Called with the number of a numbered line of Claude that is clicked, undefined when the event cannot be answered by a click */
  onChoose?: ((choice: string) => void) | undefined
}

/**
 * One line of the conversation with Claude: what the user said, what Claude says, a tool it runs, a turn that failed, the end of the session
 * @param props the props
 * @returns the line, nothing for the end of a turn that went well
 */
export function ChatMessage({ event, onChoose }: Readonly<ChatMessageProps>) {
  if (event.type === 'user')
    return (
      <p data-type="user" className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-lg bg-accent/15 px-3 py-2 text-sm">
        {event.text}
      </p>
    )
  if (event.type === 'text') return <ClaudeText onChoose={onChoose} text={event.text} />
  if (event.type === 'tool')
    return (
      <p data-type="tool" className="font-mono text-xs text-foreground/40">
        {`▸ ${event.name} ${event.detail}`.trim()}
      </p>
    )
  if (event.type === 'exit') return <p data-type="exit" className="text-xs text-foreground/60 italic">{`Session ended: ${event.message}`}</p>
  return event.isError ? (
    <p data-type="error" className="text-xs text-danger">
      Claude hit an error on this turn
    </p>
  ) : undefined
}
