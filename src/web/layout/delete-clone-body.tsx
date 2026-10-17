import type { DeletePreview } from '../../shared/action.ts'
import { IgnoredFiles } from './ignored-files.tsx'

/** What the body of the delete confirmation shows */
export interface DeleteCloneBodyProps {
  /** Why the delete failed after it was confirmed, undefined before */
  error: string | undefined
  /** True while the server proves again that the delete is safe */
  isLoading: boolean
  /** What the server found, undefined before the answer */
  preview: DeletePreview | undefined
  /** Why the server could not be asked, undefined when it answered */
  previewError: string | undefined
}

/**
 * What the delete would do: the proof is being redone, the delete is refused with its reason, or the folder and the ignored files that would be lost for good. Everything else in the clone is on GitHub
 * @param props the props
 * @param props.error why the delete failed after it was confirmed
 * @param props.isLoading true while the proof is redone
 * @param props.preview what the server found
 * @param props.previewError why the server could not be asked
 * @returns the body
 */
export function DeleteCloneBody({ error, isLoading, preview, previewError }: Readonly<DeleteCloneBodyProps>) {
  if (isLoading) return <p data-testid="delete-checking">Checking again, with a fresh git fetch, that nothing would be lost…</p>
  if (previewError !== undefined) return <p data-testid="delete-refused">{previewError}</p>
  if (preview?.ok !== true) return <p data-testid="delete-refused">{preview?.reason}</p>
  return (
    <div data-testid="delete-preview">
      <p>{`This deletes the folder ${preview.path} for good. Everything in it is on GitHub, except the files git ignores:`}</p>
      <IgnoredFiles files={preview.ignoredFiles} />
      {error !== undefined && <p data-testid="delete-error">{error}</p>}
    </div>
  )
}
