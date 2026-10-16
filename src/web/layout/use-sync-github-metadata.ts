import { useState } from 'react'
import type { MetadataPreview, MetadataValues } from '../../shared/action.ts'
import { usePreviewedDialog } from './use-previewed-dialog.ts'

/** The values before the server answered, nothing shows them */
const noValues: MetadataValues = { description: '', homepage: '' }

/**
 * The state of the Sync infos dialog: the preview of the server, and the values the user edited in the inputs, which start as the proposed ones and are sent with the confirmation
 * @param name the repo name
 * @returns what the button and the dialog need
 * @example const sync = useSyncGithubMetadata('finga')
 */
export function useSyncGithubMetadata(name: string) {
  const [edited, setEdited] = useState<MetadataValues | undefined>()
  const dialog = usePreviewedDialog<MetadataPreview>(name, 'sync-github-metadata', { body: edited })
  const values = edited ?? (dialog.preview?.ok === true ? dialog.preview.proposed : noValues)
  const handleOpen = () => {
    setEdited(undefined)
    dialog.handleOpen()
  }
  return { ...dialog, handleChange: setEdited, handleOpen, values }
}
