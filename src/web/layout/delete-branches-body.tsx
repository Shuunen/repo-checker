import type { DeleteBranchesPreview } from '../../shared/action.ts'
import { plural } from '../../shared/text.ts'
import { GitList } from './git-list.tsx'

/** What the body of the local branches delete confirmation shows */
export interface DeleteBranchesBodyProps {
  /** Why the delete failed after it was confirmed, undefined before */
  error: string | undefined
  /** True while the server lists the branches again */
  isLoading: boolean
  /** What the server found, undefined before the answer */
  preview: DeleteBranchesPreview | undefined
  /** Why the server could not be asked, undefined when it answered */
  previewError: string | undefined
}

/**
 * What the delete would do: the list is being made again, the delete is refused with its reason, or the list of the local branches that go
 * @param props the props
 * @param props.error why the delete failed after it was confirmed
 * @param props.isLoading true while the list is made again
 * @param props.preview what the server found
 * @param props.previewError why the server could not be asked
 * @returns the body
 */
export function DeleteBranchesBody({ error, isLoading, preview, previewError }: Readonly<DeleteBranchesBodyProps>) {
  if (isLoading) return <p data-testid="delete-branches-checking">Listing the local branches on the clone as it is now…</p>
  if (previewError !== undefined) return <p data-testid="delete-branches-refused">{previewError}</p>
  if (preview?.ok !== true) return <p data-testid="delete-branches-refused">{preview?.reason}</p>
  return (
    <div className="flex flex-col gap-3" data-testid="delete-branches-preview">
      <GitList items={preview.branches} testId="delete-branches-list" title={`Delete ${plural(preview.branches.length, 'local branch')}, even the ones with work that is not on GitHub:`} />
      {error !== undefined && <p data-testid="delete-branches-error">{error}</p>}
    </div>
  )
}
