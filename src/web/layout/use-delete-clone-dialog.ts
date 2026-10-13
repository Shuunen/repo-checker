import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getDeletePreview } from '../actions/get-delete-preview.ts'
import { postAction } from '../actions/post-action.ts'
import { scanQueryKey } from '../scan/scan-query.ts'

/**
 * The delete confirmation: when it opens the server proves again that the delete is safe and lists what would be lost, and the delete only runs once confirmed. When it worked the dialog closes and the scan runs again, when it was refused the dialog stays open with the reason
 * @param name the repo name
 * @returns what the button and the dialog need
 * @example const dialog = useDeleteCloneDialog('jozzo')
 */
export function useDeleteCloneDialog(name: string) {
  const [isOpen, setIsOpen] = useState(false)
  const client = useQueryClient()
  const preview = useQuery({ enabled: isOpen, gcTime: 0, queryFn: () => getDeletePreview(name), queryKey: ['delete-clone-preview', name], retry: false })
  const remove = useMutation({ mutationFn: () => postAction(name, 'delete-clone'), onSuccess: () => client.invalidateQueries({ queryKey: scanQueryKey }) })
  const handleOpen = () => {
    remove.reset()
    setIsOpen(true)
  }
  const handleConfirm = () => remove.mutate(undefined, { onSuccess: () => setIsOpen(false) })
  return {
    error: remove.error?.message,
    handleClose: () => setIsOpen(false),
    handleConfirm,
    handleOpen,
    handleOpenChange: setIsOpen,
    isLoading: preview.isFetching,
    isOpen,
    isPending: remove.isPending,
    preview: preview.data,
    previewError: preview.error?.message,
  }
}
