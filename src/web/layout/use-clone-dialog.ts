import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { postClone } from '../actions/post-clone.ts'
import { scanQueryKey } from '../scan/scan-query.ts'

/**
 * The clone confirmation: open or not, and the clone it runs once confirmed through the server. When it worked the dialog closes and the scan runs again, when it was refused the dialog stays open with the reason
 * @param name the repo name
 * @returns what the button and the dialog need
 * @example const dialog = useCloneDialog('finga')
 */
export function useCloneDialog(name: string) {
  const [isOpen, setIsOpen] = useState(false)
  const client = useQueryClient()
  const clone = useMutation({ mutationFn: () => postClone(name), onSuccess: () => client.invalidateQueries({ queryKey: scanQueryKey }) })
  const handleOpen = () => {
    clone.reset()
    setIsOpen(true)
  }
  const handleConfirm = () => clone.mutate(undefined, { onSuccess: () => setIsOpen(false) })
  return { error: clone.error?.message, handleClose: () => setIsOpen(false), handleConfirm, handleOpen, handleOpenChange: setIsOpen, isOpen, isPending: clone.isPending }
}
