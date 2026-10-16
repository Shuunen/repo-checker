import { toast } from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { FixStage } from '../../shared/action.ts'
import { getPreview, type PreviewedAction } from '../actions/get-preview.ts'
import { doneMessages, postAction } from '../actions/post-action.ts'
import { refreshProject } from '../scan/refresh-project.ts'

/** The optional parts of the dialog of an action */
interface DialogOptions<Preview extends { ok: boolean }> {
  /** What the user edited, sent as JSON with the confirmation, for the actions that take values */
  body?: object | undefined
  /** Reads the fingerprint of the list from an offered preview, only for the actions that throw something away */
  fingerprintOf?: (preview: Extract<Preview, { ok: true }>) => string
  /** True to ask the server to commit what the action wrote */
  isCommit?: boolean
  /** Called with each step the server enters, for the actions that stream their steps */
  onStage?: (stage: FixStage) => void
  /** Called once the action worked, before the scan of the project runs again, with the output of the failing check when it prevented the automatic commit */
  onDone?: (commitBlocked: string | undefined) => void
}

/**
 * The confirmation of an action that shows what it would do first: when the dialog opens the server proves again that the action is right and says what it would do, and the action only runs once confirmed. For an action that throws something away, the fingerprint of the list shown is sent with the confirmation, and the server refuses if the clone changed. When it worked the dialog closes and the scan runs again, when it was refused the dialog stays open with the reason
 * @template Preview the shape of the server's answer
 * @param name the repo name
 * @param action the action
 * @param options the optional parts
 * @param options.body what the user edited, sent as JSON with the confirmation
 * @param options.fingerprintOf reads the fingerprint of the list from an offered preview, only for the actions that throw something away
 * @param options.isCommit true to ask the server to commit what the action wrote
 * @param options.onStage called with each step the server enters
 * @param options.onDone called once the action worked, before the scan of the project runs again, with the output of the failing check when it prevented the automatic commit
 * @returns what the button and the dialog need
 * @example const dialog = usePreviewedDialog<DeletePreview>('jozzo', 'delete-clone')
 */
export function usePreviewedDialog<Preview extends { ok: boolean }>(name: string, action: PreviewedAction, { body, fingerprintOf, isCommit = false, onDone, onStage }: Readonly<DialogOptions<Preview>> = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const client = useQueryClient()
  const preview = useQuery({ enabled: isOpen, gcTime: 0, queryFn: () => getPreview<Preview>(name, action), queryKey: ['preview', action, name], retry: false })
  const fingerprint = preview.data?.ok === true ? fingerprintOf?.(preview.data as Extract<Preview, { ok: true }>) : undefined
  const run = useMutation({
    mutationFn: () => postAction(name, action, { body, fingerprint, isCommit, onStage }),
    onSuccess: blocked => {
      if (blocked === undefined) toast.success(doneMessages[action].replace('{name}', name))
      onDone?.(blocked)
      return refreshProject(client, name)
    },
  })
  return {
    error: run.error?.message,
    handleClose: () => setIsOpen(false),
    handleConfirm: () => run.mutate(undefined, { onSuccess: () => setIsOpen(false) }),
    handleOpen: () => {
      run.reset()
      setIsOpen(true)
    },
    handleOpenChange: setIsOpen,
    isLoading: preview.isFetching,
    isOpen,
    isPending: run.isPending,
    preview: preview.data,
    previewError: preview.error?.message,
  }
}
