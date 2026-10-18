import { invariant } from 'es-toolkit'
import { useEffect, useRef } from 'react'
import { ChatMessage } from './chat-message.tsx'
import type { useUpdateChat } from './use-update-chat.ts'

/**
 * The conversation with Claude, scrolled to its end whenever it changes
 * @param props the props
 * @param props.chat the conversation
 * @returns the transcript, with what is going on and what went wrong
 */
export function UpdateTranscript({ chat }: Readonly<{ chat: ReturnType<typeof useUpdateChat> }>) {
  const transcript = useRef<HTMLDivElement>(null)
  useEffect(() => {
    invariant(transcript.current !== null, 'the effect runs once the transcript is shown')
    transcript.current.scrollTop = transcript.current.scrollHeight
  })
  return (
    <>
      <div className="flex max-h-[55vh] min-h-48 flex-col gap-2 overflow-y-auto" data-testid="update-transcript" ref={transcript}>
        {chat.events.map((event, index) => (
          // oxlint-disable-next-line react/no-array-index-key -- the conversation only grows, an event keeps its place
          <ChatMessage event={event} key={index} />
        ))}
        {chat.events.length === 0 && chat.error === undefined && <p className="text-sm text-muted">Starting Claude…</p>}
        {chat.isWorking && (
          <p className="text-xs text-muted" data-testid="update-working">
            Claude is working…
          </p>
        )}
      </div>
      {chat.error !== undefined && <p data-testid="update-error">{chat.error}</p>}
    </>
  )
}
