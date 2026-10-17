import type { ForkDeletePreview } from '../../shared/action.ts'
import { plural } from '../../shared/text.ts'
import { IgnoredFiles } from './ignored-files.tsx'

/** What the body of the fork delete confirmation shows */
export interface DeleteForkBodyProps {
  /** Why the delete failed after it was confirmed, undefined before */
  error: string | undefined
  /** True while the server proves again that the fork is pristine */
  isLoading: boolean
  /** What the server found, undefined before the answer */
  preview: ForkDeletePreview | undefined
  /** Why the server could not be asked, undefined when it answered */
  previewError: string | undefined
  /** The `owner/name` of the fork */
  slug: string
}

/**
 * What the delete would do: the proof is being redone, the delete is refused with its reason (a branch ahead, an open pull request, a missing token scope with the command to fix it), or the fork that is deleted on GitHub for good and its clean clone
 * @param props the props
 * @param props.error why the delete failed after it was confirmed
 * @param props.isLoading true while the proof is redone
 * @param props.preview what the server found
 * @param props.previewError why the server could not be asked
 * @param props.slug the `owner/name` of the fork
 * @returns the body
 */
export function DeleteForkBody({ error, isLoading, preview, previewError, slug }: Readonly<DeleteForkBodyProps>) {
  if (isLoading) return <p data-testid="fork-checking">Checking again, comparing every branch with the parent, the open pull requests and your gh token…</p>
  if (previewError !== undefined) return <p data-testid="fork-refused">{previewError}</p>
  if (preview?.ok !== true) return <p data-testid="fork-refused">{preview?.reason}</p>
  return (
    <div data-testid="fork-preview">
      <p>{`This deletes the fork ${slug} on GitHub for good, it cannot be undone. ${plural(preview.branches, 'branch')} compared with ${preview.parent}: none has a commit that ${preview.parent} does not have, and no pull request is open.`}</p>
      {preview.clone !== undefined && <p data-testid="fork-clone">{`Its clean local clone ${preview.clone.path} is deleted too, with the files git ignores in it:`}</p>}
      {preview.clone !== undefined && <IgnoredFiles files={preview.clone.ignoredFiles} />}
      {error !== undefined && <p data-testid="fork-error">{error}</p>}
    </div>
  )
}
