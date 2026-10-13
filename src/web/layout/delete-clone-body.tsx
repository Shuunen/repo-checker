import type { DeletePreview } from '../../shared/action.ts'
import { plural } from '../../shared/text.ts'

/** How many ignored files are listed before the rest is counted */
const maxListed = 20

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
 * Say how many ignored files would be lost
 * @param count how many ignored files the clone holds
 * @returns the sentence
 */
function lostText(count: number) {
  if (count === 0) return 'No ignored file would be lost.'
  return `${plural(count, 'ignored file')} would be lost${count > maxListed ? `, the first ${maxListed} are listed` : ''}.`
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
      <ul>
        {preview.ignoredFiles.slice(0, maxListed).map(file => (
          <li key={file}>{file}</li>
        ))}
      </ul>
      <p>{lostText(preview.ignoredFiles.length)}</p>
      {error !== undefined && <p data-testid="delete-error">{error}</p>}
    </div>
  )
}
