import type { FixPreview } from '../../shared/action.ts'
import { plural } from '../../shared/text.ts'
import { FileDiff } from './file-diff.tsx'

/** What the body of the file fixes confirmation shows */
export interface FixFilesBodyProps {
  /** Why the fix failed after it was confirmed, undefined before */
  error: string | undefined
  /** True while the server plans the fixes again */
  isLoading: boolean
  /** What the server found, undefined before the answer */
  preview: FixPreview | undefined
  /** Why the server could not be asked, undefined when it answered */
  previewError: string | undefined
}

/**
 * What the fixes would do: the plan is being made again, the fix is refused with its reason, or a diff per file, and the files with uncommitted changes that are left alone. Nothing is committed, git shows the change and can undo it
 * @param props the props
 * @param props.error why the fix failed after it was confirmed
 * @param props.isLoading true while the plan is made again
 * @param props.preview what the server found
 * @param props.previewError why the server could not be asked
 * @returns the body
 */
export function FixFilesBody({ error, isLoading, preview, previewError }: Readonly<FixFilesBodyProps>) {
  if (isLoading) return <p data-testid="fix-checking">Planning the fixes again on the files as they are now…</p>
  if (previewError !== undefined) return <p data-testid="fix-refused">{previewError}</p>
  if (preview?.ok !== true) return <p data-testid="fix-refused">{preview?.reason}</p>
  return (
    <div className="flex flex-col gap-3" data-testid="fix-preview">
      <p>{`${plural(preview.plans.length, 'file')} rewritten in ${preview.path}. Nothing is committed: git diff shows exactly this, and git checkout undoes it.`}</p>
      {preview.plans.map(plan => (
        <FileDiff after={plan.after} before={plan.before} file={plan.file} key={plan.file} />
      ))}
      {preview.blocked.map(item => (
        <p data-testid={`fix-blocked-${item.file}`} key={item.file}>{`${item.file} is left alone, ${item.reason}.`}</p>
      ))}
      {error !== undefined && <p data-testid="fix-error">{error}</p>}
    </div>
  )
}
