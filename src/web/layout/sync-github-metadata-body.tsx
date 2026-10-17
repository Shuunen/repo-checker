import { Input, Label, TextField } from '@heroui/react'
import type { MetadataPreview, MetadataValues } from '../../shared/action.ts'
import { MetadataTable } from './metadata-table.tsx'
import { metadataFields as fields } from './metadata-fields.ts'

/** What the body of the sync confirmation shows */
export interface SyncGithubMetadataBodyProps {
  /** Why the sync failed after it was confirmed, undefined before */
  error: string | undefined
  /** True while the server reads GitHub and the package.json again */
  isLoading: boolean
  /** Called with the values when the user edits one */
  onChange: (values: MetadataValues) => void
  /** What the server found, undefined before the answer */
  preview: MetadataPreview | undefined
  /** Why the server could not be asked, undefined when it answered */
  previewError: string | undefined
  /** The values in the inputs */
  values: MetadataValues
}

/**
 * What the sync would do: the proof is being redone, it is refused with its reason, or a table of what the package.json and GitHub have per field, and an input per field to edit what is synced
 * @param props the props
 * @param props.error why the sync failed after it was confirmed
 * @param props.isLoading true while the server reads again
 * @param props.onChange called with the values when the user edits one
 * @param props.preview what the server found
 * @param props.previewError why the server could not be asked
 * @param props.values the values in the inputs
 * @returns the body
 */
export function SyncGithubMetadataBody({ error, isLoading, onChange, preview, previewError, values }: Readonly<SyncGithubMetadataBodyProps>) {
  if (isLoading) return <p data-testid="sync-github-metadata-checking">Reading GitHub and the package.json again…</p>
  if (previewError !== undefined) return <p data-testid="sync-github-metadata-refused">{previewError}</p>
  if (preview?.ok !== true) return <p data-testid="sync-github-metadata-refused">{preview?.reason}</p>
  return (
    <div className="flex flex-col gap-4" data-testid="sync-github-metadata-preview">
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
      {error !== undefined && <p data-testid="sync-github-metadata-error">{error}</p>}
    </div>
  )
}
