import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { postAction } from '../actions/post-action.ts'
import { refreshProject } from '../scan/refresh-project.ts'

/**
 * The confirmation of an action: open or not, and the action it runs through the server once confirmed. When it worked the dialog closes and the scan runs again, when it was refused the dialog stays open with the reason
 * @param name the repo name
 * @param action the action the server runs, `clone` or `unarchive-push` (the delete has its own dialog, it checks again before it opens)
 * @returns what the button and the dialog need
 * @example const dialog = useActionDialog('finga', 'clone')
 */
export function useActionDialog(name: string, action: 'clone' | 'unarchive-push') {
  const [isOpen, setIsOpen] = useState(false)
  const client = useQueryClient()
  const run = useMutation({ mutationFn: () => postAction(name, action), onSuccess: () => refreshProject(client, name) })
  const handleOpen = () => {
    run.reset()
    setIsOpen(true)
  }
  const handleConfirm = () => run.mutate(undefined, { onSuccess: () => setIsOpen(false) })
  return { error: run.error?.message, handleClose: () => setIsOpen(false), handleConfirm, handleOpen, handleOpenChange: setIsOpen, isOpen, isPending: run.isPending }
}
