import { toast } from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { type FixStage, type PostedAction, postedActions, type Refused } from '../../shared/action.ts'
import { getPreview } from '../actions/get-preview.ts'
import { doneMessage, postAction } from '../actions/post-action.ts'
import { refreshProject } from '../scan/refresh-project.ts'

/** The answer of a preview: what the action would do, or why it is refused */
export type AnyPreview = Refused | { ok: true }

/** What the frame of a confirmation needs to open, close and confirm */
export interface DialogControls {
  /** False keeps the confirm button disabled: the preview is being read, or the action is refused */
  canConfirm: boolean
  /** Close the dialog without running the action */
  handleClose: () => void
  /** Run the action, the dialog closes once it worked */
  handleConfirm: () => void
  /** Called with the new state when the dialog opens or closes */
  handleOpenChange: (isOpen: boolean) => void
  /** True when the dialog is shown */
  isOpen: boolean
  /** True while the server runs the action */
  isPending: boolean
}

/**
 * What a confirmation shows and does: its frame, and what the server said
 * @template Preview the shape of the preview
 */
export interface ActionDialog<Preview extends AnyPreview = AnyPreview> extends DialogControls {
  /** Run the action, resolves once the dialog closed, rejects with the reason when it failed */
  confirm: () => Promise<void>
  /** Why the action failed after it was confirmed, undefined before */
  error: string | undefined
  /** Open the dialog, which asks the server for the preview when the action has one */
  handleOpen: () => void
  /** True while the server proves again that the action is right */
  isLoading: boolean
  /** What the server found, undefined before the answer and for an action without preview */
  preview: Preview | undefined
  /** Why the server could not be asked, undefined when it answered */
  previewError: string | undefined
}

/** The optional parts of the dialog of an action */
interface DialogOptions {
  /** What the user edited, sent as JSON with the confirmation, for the actions that take values */
  body?: object | undefined
  /** True to ask the server to commit what the action wrote */
  isCommit?: boolean
  /** Called with each step the server enters, for the actions that stream their steps */
  onStage?: (stage: FixStage) => void
  /** Called once the action worked, before the scan of the project runs again, with the output of the failing check when it prevented the automatic commit */
  onDone?: (commitBlocked: string | undefined) => void
}

/**
 * Read the fingerprint of a preview that offers the action, the server refuses the confirmation when what it lists changed
 * @param preview the preview
 * @returns the fingerprint, undefined when the preview has none
 */
function fingerprintOf(preview: Readonly<AnyPreview> | undefined) {
  return preview?.ok === true && 'fingerprint' in preview ? String(preview.fingerprint) : undefined
}

/**
 * Run an action through the server once confirmed: the toast and the scan of the project again when it worked
 * @param name the repo name
 * @param action the action
 * @param options the optional parts, with the fingerprint of the preview the user confirmed
 * @param options.body what the user edited, sent as JSON with the confirmation
 * @param options.fingerprint the fingerprint of the preview the user confirmed
 * @param options.isCommit true to ask the server to commit what the action wrote
 * @param options.onDone called once the action worked
 * @param options.onStage called with each step the server enters
 * @returns the mutation
 */
function useRun(name: string, action: PostedAction, { body, fingerprint, isCommit = false, onDone, onStage }: Readonly<DialogOptions & { fingerprint: string | undefined }>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => postAction(name, action, { body, fingerprint, isCommit, onStage }),
    onSuccess: blocked => {
      if (blocked === undefined) toast.success(doneMessage(action, name))
      onDone?.(blocked)
      return refreshProject(client, name)
    },
  })
}

/**
 * The confirmation of an action. When the action has a preview, opening the dialog asks the server to prove again that the action is right and say what it would do, and the fingerprint of what was shown is sent back with the confirmation. When it worked the dialog closes and the scan of the project runs again, when it was refused the dialog stays open with the reason
 * @template Preview the shape of the preview
 * @param name the repo name
 * @param action the action
 * @param options the optional parts
 * @param options.body what the user edited, sent as JSON with the confirmation
 * @param options.isCommit true to ask the server to commit what the action wrote
 * @param options.onStage called with each step the server enters
 * @param options.onDone called once the action worked, with the output of the failing check when it prevented the automatic commit
 * @returns what the button and the dialog need
 * @example const dialog = useActionDialog<DeletePreview>('jozzo', 'delete-clone')
 */
export function useActionDialog<Preview extends AnyPreview = AnyPreview>(name: string, action: PostedAction, options: Readonly<DialogOptions> = {}): ActionDialog<Preview> {
  const [isOpen, setIsOpen] = useState(false)
  const hasPreview = 'hasPreview' in postedActions[action]
  const preview = useQuery({ enabled: isOpen && hasPreview, gcTime: 0, queryFn: () => getPreview<Preview>(name, action), queryKey: ['preview', action, name], retry: false })
  const run = useRun(name, action, { ...options, fingerprint: fingerprintOf(preview.data) })
  return {
    canConfirm: !preview.isFetching && (!hasPreview || preview.data?.ok === true),
    confirm: () => run.mutateAsync().then(() => setIsOpen(false)),
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

/** True when the action was chosen in the Actions menu: its dialog opens at once and its button is not shown */
export const OpensAtOnce = createContext(false)

/**
 * Open the dialog of an action at once, a single time, when it was chosen in the Actions menu
 * @param open opens the dialog
 * @returns true when the action was chosen in the menu, its button is then not shown
 * @example const isAtOnce = useOpensAtOnce(dialog.handleOpen)
 */
export function useOpensAtOnce(open: () => void) {
  const isAtOnce = useContext(OpensAtOnce)
  const isOpened = useRef(false)
  useEffect(() => {
    if (!isAtOnce || isOpened.current) return
    isOpened.current = true
    open()
  })
  return isAtOnce
}
