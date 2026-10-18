import { Button, TextArea } from '@heroui/react'
import { useState } from 'react'
import type { useUpdateChat } from './use-update-chat.ts'

/**
 * The box to answer Claude: Enter sends the message, Shift+Enter adds a line
 * @param props the props
 * @param props.chat the conversation, the message is sent to its session
 * @returns the box and its Send button
 */
export function UpdateComposer({ chat }: Readonly<{ chat: ReturnType<typeof useUpdateChat> }>) {
  const [draft, setDraft] = useState('')
  const handleSend = () => {
    if (draft.trim() === '') return
    void chat.handleSend(draft)
    setDraft('')
  }
  return (
    <div className="flex items-end gap-2">
      <TextArea
        aria-label="Message for Claude"
        className="flex-1"
        data-testid="update-input"
        disabled={chat.isEnded}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => {
          if (event.key !== 'Enter' || event.shiftKey) return
          event.preventDefault()
          handleSend()
        }}
        placeholder="Answer Claude… (Enter sends, Shift+Enter adds a line)"
        rows={2}
        value={draft}
      />
      <Button data-testid="update-send" isDisabled={chat.isEnded || draft.trim() === ''} onPress={handleSend} variant="secondary">
        Send
      </Button>
    </div>
  )
}
