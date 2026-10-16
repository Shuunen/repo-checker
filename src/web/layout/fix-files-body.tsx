import type { FixPreview, FixStage } from '../../shared/action.ts'
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
  /** The step the fix is in while it runs, undefined before it is confirmed */
  stage: FixStage | undefined
}

/** What the dialog says of each step of the fix */
const stageMessages: Record<FixStage, string> = {
  checking: 'Running the check of the project…',
  committing: 'Preparing the commit…',
  installing: 'Installing the dev dependencies…',
  pushing: 'Pushing the commit…',
  writing: 'Writing the fixes…',
}

/**
 * What the fixes would do: the plan is being made again, the fix is refused with its reason, or a diff per file, and the files with uncommitted changes that are left alone. Committing is up to the toggle in the footer
 * @param props the props
 * @param props.error why the fix failed after it was confirmed
 * @param props.isLoading true while the plan is made again
 * @param props.preview what the server found
 * @param props.previewError why the server could not be asked
 * @param props.stage the step the fix is in while it runs, it replaces the diffs
 * @returns the body
 */
export function FixFilesBody({ error, isLoading, preview, previewError, stage }: Readonly<FixFilesBodyProps>) {
  if (stage !== undefined) return <p data-testid={`fix-stage-${stage}`}>{stageMessages[stage]}</p>
  if (isLoading) return <p data-testid="fix-checking">Planning the fixes again on the files as they are now…</p>
  if (previewError !== undefined) return <p data-testid="fix-refused">{previewError}</p>
  if (preview?.ok !== true) return <p data-testid="fix-refused">{preview?.reason}</p>
  return (
    <div className="flex flex-col gap-3" data-testid="fix-preview">
      <p>{`${plural(preview.plans.length, 'file')} rewritten in ${preview.path}. git shows exactly this, and can undo it.`}</p>
      {preview.plans.map(plan => (
        <FileDiff after={plan.after} before={plan.before} file={plan.file} key={plan.file} />
      ))}
      {preview.installs.length > 0 && <p data-testid="fix-installs">{`Then installs ${preview.installs.join(', ')} with the package manager of the project.`}</p>}
      {preview.merged.map(file => (
        <p data-testid={`fix-merged-${file}`} key={file}>{`${file} has uncommitted changes, the fix is merged into them and it stays out of the commit.`}</p>
      ))}
      {error !== undefined && <p data-testid="fix-error">{error}</p>}
    </div>
  )
}
