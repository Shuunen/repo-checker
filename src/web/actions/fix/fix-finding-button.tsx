import { Button } from '@heroui/react'
import { CommitBlockedDialog } from './commit-blocked-dialog.tsx'
import { FixFilesDialog } from './fix-files-dialog.tsx'
import { useFixFiles } from './use-fix-files.ts'

/** What `FixFindingButton` shows and does */
interface FixFindingButtonProps {
  /** The repo name of the project */
  projectName: string
  /** The id of the rule whose finding is fixed */
  ruleId: string
}

/**
 * The button that fixes a single finding, shown when hovering it: it opens the same diff dialog as the fixes of the whole project, limited to the files that finding changes, and the same toast says it worked
 * @param props the props
 * @returns the button, its dialog and the notice of a prevented commit
 */
export function FixFindingButton({ projectName, ruleId }: Readonly<FixFindingButtonProps>) {
  const { commitBlocked, dialog, handleCommitBlockedClose } = useFixFiles(projectName, ruleId)
  return (
    <>
      <Button className="bg-background opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100" data-testid={`fix-${ruleId}`} onPress={dialog.handleOpen} size="sm" variant="outline">
        Fix
      </Button>
      <FixFilesDialog dialog={dialog} rule={ruleId} slug={projectName} />
      <CommitBlockedDialog onClose={handleCommitBlockedClose} output={commitBlocked} />
    </>
  )
}
