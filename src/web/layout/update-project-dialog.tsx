import { Button } from '@heroui/react'
import { UpdateComposer } from './update-composer.tsx'
import { UpdateFrame } from './update-frame.tsx'
import { UpdateTranscript } from './update-transcript.tsx'
import type { useUpdateChat } from './use-update-chat.ts'

/** What `UpdateProjectDialog` shows and does */
interface UpdateProjectDialogProps {
  /** The conversation and what the dialog does */
  chat: ReturnType<typeof useUpdateChat>
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The chat with Claude on the update of a project, in a modal that only the Close session button closes
 * @param props the props
 * @returns the dialog
 */
export function UpdateProjectDialog({ chat, slug }: Readonly<UpdateProjectDialogProps>) {
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
