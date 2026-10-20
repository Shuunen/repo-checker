import type { GitFixPreview } from '../../shared/action.ts'
import { plural } from '../../shared/text.ts'
import { GitList } from './git-list.tsx'
import { PreviewBody } from './preview-body.tsx'
import type { ActionDialog } from './use-action-dialog.ts'

/**
 * What the git fixes would do: the plan is being redone, it is refused with its reason, or the pull, the branches moved forward, the stashes dropped and the branches deleted
 * @param props the props
 * @param props.dialog the dialog of the git fixes
 * @returns the body
 */
export function FixGitBody({ dialog }: Readonly<{ dialog: ActionDialog<GitFixPreview> }>) {
  return (
    <PreviewBody checking="Planning the git fixes again on the clone as it is now…" className="flex flex-col gap-3" dialog={dialog} prefix="fix-git">
      {preview => (
        <>
          {preview.pull !== undefined && <p data-testid="fix-git-pull">{`Pull ${preview.pull}, fast forward only.`}</p>}
          <GitList items={preview.fastForward} testId="fix-git-fast-forward" title={`Move ${plural(preview.fastForward.length, 'other branch')} forward to its remote, fast forward only:`} />
          <GitList items={preview.stashes} testId="fix-git-stashes" title={`Drop ${plural(preview.stashes.length, 'stash')}, for good:`} />
          <GitList items={preview.branches} testId="fix-git-branches" title={`Delete ${plural(preview.branches.length, 'local branch')}, already merged or without upstream, even the ones with work that is not merged:`} />
        </>
      )}
    </PreviewBody>
  )
}
