import { Input, Label, TextField } from '@heroui/react'
import type { MetadataPreview, MetadataValues } from '../../shared/action.ts'
import { MetadataTable } from './metadata-table.tsx'
import { metadataFields as fields } from './metadata-fields.ts'
import { PreviewBody } from './preview-body.tsx'
import type { ActionDialog } from './use-action-dialog.ts'

/** What the body of the sync confirmation shows and does */
interface SyncGithubMetadataBodyProps {
  /** What the server said */
  dialog: ActionDialog<MetadataPreview>
  /** Called with the values when the user edits one */
  onChange: (values: MetadataValues) => void
  /** The values in the inputs */
  values: MetadataValues
}

/**
 * What the sync would do: the proof is being redone, it is refused with its reason, or a table of what the package.json and GitHub have per field, and an input per field to edit what is synced
 * @param props the props
 * @returns the body
 */
export function SyncGithubMetadataBody({ dialog, onChange, values }: Readonly<SyncGithubMetadataBodyProps>) {
  return (
    <PreviewBody checking="Reading GitHub and the package.json again…" className="flex flex-col gap-4" dialog={dialog} prefix="sync-github-metadata">
      {preview => (
        <>
          <MetadataTable github={preview.github} local={preview.local} />
          <p>
            Edit the values to sync, or empty one to clear it. What you confirm is written on GitHub and in the project: the description in its package.json, the homepage (the deployed website, not the source code) as webUrl in its .repo-checker.json. The homepage property of the package.json is the
            repo and is left alone.
          </p>
          {fields.map(({ key, label }) => (
            <TextField key={key} onChange={value => onChange({ ...values, [key]: value })} value={values[key]}>
              <Label>{label}</Label>
              <Input className="border border-border bg-default" data-testid={`sync-github-metadata-${key}`} />
            </TextField>
          ))}
        </>
      )}
    </PreviewBody>
  )
}
