import type { DiscardPreview } from '../../shared/action.ts'
import { UnsavedList } from './unsaved-list.tsx'

/** What the body of the discard confirmation shows */
export interface DiscardBodyProps {
  /** Why the discard failed after it was confirmed, undefined before */
  error: string | undefined
  /** True while the server reads, fresh, what would be thrown away */
  isLoading: boolean
  /** What the server found, undefined before the answer */
  preview: DiscardPreview | undefined
  /** Why the server could not be asked, undefined when it answered */
  previewError: string | undefined
}

/**
 * What the discard would do: the list is being read again, the discard is refused with its reason, or the exact list of everything that is thrown away for good. Ignored files stay
 * @param props the props
 * @param props.error why the discard failed after it was confirmed
 * @param props.isLoading true while the list is read again
 * @param props.preview what the server found
 * @param props.previewError why the server could not be asked
 * @returns the body
 */
export function DiscardBody({ error, isLoading, preview, previewError }: Readonly<DiscardBodyProps>) {
  if (isLoading) return <p data-testid="discard-checking">Reading again, with a fresh git fetch, exactly what would be thrown away…</p>
  if (previewError !== undefined) return <p data-testid="discard-refused">{previewError}</p>
  if (preview?.ok !== true) return <p data-testid="discard-refused">{preview?.reason}</p>
  return (
    <div data-testid="discard-preview">
      <p>{`The clone ${preview.path} goes back to exactly what GitHub has. All of this is thrown away for good, there is no undo. The files git ignores stay.`}</p>
      <UnsavedList groups={preview.groups} />
      {error !== undefined && <p data-testid="discard-error">{error}</p>}
    </div>
  )
}
