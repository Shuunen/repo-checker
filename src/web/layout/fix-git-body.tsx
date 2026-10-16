import type { GitFixPreview } from '../../shared/action.ts'
import { plural } from '../../shared/text.ts'
import { GitList } from './git-list.tsx'

/** What the body of the git fixes confirmation shows */
export interface FixGitBodyProps {
  /** Why the fix failed after it was confirmed, undefined before */
  error: string | undefined
  /** True while the server plans the fixes again */
  isLoading: boolean
  /** What the server found, undefined before the answer */
  preview: GitFixPreview | undefined
  /** Why the server could not be asked, undefined when it answered */
  previewError: string | undefined
}

/**
 * What the git fixes would do: the plan is being made again, the fix is refused with its reason, or the list of what is deleted and pulled
 * @param props the props
 * @param props.error why the fix failed after it was confirmed
 * @param props.isLoading true while the plan is made again
 * @param props.preview what the server found
 * @param props.previewError why the server could not be asked
 * @returns the body
 */
export function FixGitBody({ error, isLoading, preview, previewError }: Readonly<FixGitBodyProps>) {
  if (isLoading) return <p data-testid="fix-git-checking">Planning the git fixes again on the clone as it is now…</p>
  if (previewError !== undefined) return <p data-testid="fix-git-refused">{previewError}</p>
  if (preview?.ok !== true) return <p data-testid="fix-git-refused">{preview?.reason}</p>
  return (
    <div className="flex flex-col gap-3" data-testid="fix-git-preview">
      {preview.pull !== undefined && <p data-testid="fix-git-pull">{`Pull ${preview.pull}, fast forward only.`}</p>}
      <GitList items={preview.stashes} testId="fix-git-stashes" title={`Drop ${plural(preview.stashes.length, 'stash')}, for good:`} />
      <GitList items={preview.branches} testId="fix-git-branches" title={`Delete ${plural(preview.branches.length, 'local branch')} without upstream. The ones that never had an upstream are kept if git finds work in them that is not merged:`} />
      {error !== undefined && <p data-testid="fix-git-error">{error}</p>}
    </div>
  )
}
