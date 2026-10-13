import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getDiscardPreview } from '../actions/get-discard-preview.ts'
import { postAction } from '../actions/post-action.ts'
import { scanQueryKey } from '../scan/scan-query.ts'

/**
 * The discard confirmation: when it opens the server reads, fresh, exactly what would be thrown away, and the discard only runs once confirmed, with the fingerprint of that list. If the clone changed in between the server refuses. When it worked the dialog closes and the scan runs again
 * @param name the repo name
 * @returns what the button and the dialog need
 * @example const dialog = useDiscardDialog('jozzo')
 */
export function useDiscardDialog(name: string) {
  const [isOpen, setIsOpen] = useState(false)
  const client = useQueryClient()
  const preview = useQuery({ enabled: isOpen, gcTime: 0, queryFn: () => getDiscardPreview(name), queryKey: ['discard-preview', name], retry: false })
  const fingerprint = preview.data?.ok === true ? preview.data.fingerprint : undefined
  const discard = useMutation({ mutationFn: () => postAction(name, 'discard', fingerprint), onSuccess: () => client.invalidateQueries({ queryKey: scanQueryKey }) })
  const handleOpen = () => {
    discard.reset()
    setIsOpen(true)
  }
  const handleConfirm = () => discard.mutate(undefined, { onSuccess: () => setIsOpen(false) })
  return {
    error: discard.error?.message,
    handleClose: () => setIsOpen(false),
    handleConfirm,
    handleOpen,
    handleOpenChange: setIsOpen,
    isLoading: preview.isFetching,
    isOpen,
    isPending: discard.isPending,
    preview: preview.data,
    previewError: preview.error?.message,
  }
}
