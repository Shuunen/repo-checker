import type { FixStage } from '../../shared/action.ts'
import { plural } from '../../shared/text.ts'
import { FileDiff } from './file-diff.tsx'
import { PreviewBody } from './preview-body.tsx'
import type { FixFilesDialog } from './use-fix-files.ts'

/** What the body says during each step of applying the fixes */
const stageMessages: Record<FixStage, string> = {
  checking: 'Running the check of the project…',
  committing: 'Preparing the commit…',
  installing: 'Installing the dev dependencies…',
  pushing: 'Pushing the commit…',
  writing: 'Writing the fixes…',
}

/**
 * What the file fixes would do: the step the fix is in while it runs, the plan is being redone, it is refused with its reason, or a diff per file, the dev dependencies installed after, and the files whose uncommitted changes get the fix merged in
 * @param props the props
 * @param props.dialog the dialog of the file fixes
 * @returns the body
 */
export function FixFilesBody({ dialog }: Readonly<{ dialog: FixFilesDialog }>) {
  if (dialog.stage !== undefined) return <p data-testid={`fix-stage-${dialog.stage}`}>{stageMessages[dialog.stage]}</p>
  return (
    <PreviewBody checking="Planning the fixes again on the files as they are now…" className="flex flex-col gap-3" dialog={dialog} prefix="fix">
      {preview => (
        <>
          <p>{`${plural(preview.plans.length, 'file')} rewritten in ${preview.path}. git shows exactly this, and can undo it.`}</p>
          {preview.plans.map(plan => (
            <FileDiff after={plan.after} before={plan.before} file={plan.file} key={plan.file} />
          ))}
          {preview.installs.length > 0 && <p data-testid="fix-installs">{`Then installs ${preview.installs.join(', ')} with the package manager of the project.`}</p>}
          {preview.merged.map(file => (
            <p data-testid={`fix-merged-${file}`} key={file}>{`${file} has uncommitted changes, the fix is merged into them and it stays out of the commit.`}</p>
          ))}
        </>
      )}
    </PreviewBody>
  )
}
