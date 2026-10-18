import { Button } from '@heroui/react'
import { UpdateComposer } from './update-composer.tsx'
import { UpdateFrame } from './update-frame.tsx'
import { UpdateTranscript } from './update-transcript.tsx'
import type { useUpdateChat } from './use-update-chat.ts'

/**
 * The chat with Claude on the update of a project, in a modal that only the Close session button closes
 * @param props the props
 * @param props.chat the conversation and what the dialog does
 * @param props.slug the `owner/name` of the repo
 * @returns the dialog
 */
export function UpdateProjectDialog({ chat, slug }: Readonly<{ chat: ReturnType<typeof useUpdateChat>; slug: string }>) {
  const body = (
    <>
      <UpdateTranscript chat={chat} />
      <UpdateComposer chat={chat} />
    </>
  )
  const footer = (
    <Button data-testid="update-close" onPress={() => void chat.handleClose()} variant="danger-soft">
      Close session
    </Button>
  )
  return <UpdateFrame body={body} footer={footer} heading={`Update ${slug} with Claude`} isOpen={chat.isOpen} />
}
