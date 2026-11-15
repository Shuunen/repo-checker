import { useEffect, useRef, useState } from 'react'
import type { MetadataPreview, MetadataValues } from '../../../shared/action.ts'
import { useActionDialog } from '../use-action-dialog.ts'

/** The values before the server answered, nothing shows them */
const noValues: MetadataValues = { description: '', homepage: '' }

/**
 * The state of the Sync infos dialog: the preview of the server, and the values shown in the inputs, which start as the proposed ones and are sent with the confirmation, edited or not
 * @param name the repo name
 * @param fallbackHomepage the homepage proposed when the server proposes none, like the GitHub project url
 * @returns what the button and the dialog need
 * @example const sync = useSyncGithubMetadata('finga', 'https://github.com/owner/finga')
 */
export function useSyncGithubMetadata(name: string, fallbackHomepage = '') {
  const [edited, setEdited] = useState<MetadataValues | undefined>()
  const shown = useRef(noValues)
  const dialog = useActionDialog<MetadataPreview>(name, 'sync-github-metadata', { body: () => shown.current })
  const proposed = dialog.preview?.ok === true ? { ...dialog.preview.proposed, homepage: dialog.preview.proposed.homepage || fallbackHomepage } : noValues
  const values = edited ?? proposed
  useEffect(() => {
    shown.current = values
  })
  const handleOpen = () => {
    setEdited(undefined)
    dialog.handleOpen()
  }
  return { ...dialog, handleChange: setEdited, handleOpen, values }
}
