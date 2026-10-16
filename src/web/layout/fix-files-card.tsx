import { Card } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { isGitIssue, slugOf, summaryOf } from '../projects/detail.ts'
import { CommitBlockedDialog } from './commit-blocked-dialog.tsx'
import { FixButtons } from './fix-buttons.tsx'
import { FixDialogs } from './fix-dialogs.tsx'
import { useFixAll } from './use-fix-all.ts'
import { useFixFiles } from './use-fix-files.ts'
import { useFixGit } from './use-fix-git.ts'

/**
 * The fixes of a project: how many findings have a fix, and the buttons that open what each fix would do to confirm it: the files, the git issues, or both at once, the git issues first. Nothing when no finding has a fix, but the notice of a prevented commit, which stays until it is closed
 * @param props the props
 * @param props.findings the findings of the project
 * @param props.project the project
 * @returns the card, or nothing
 */
export function FixFilesCard({ findings, project }: Readonly<{ findings: readonly ScanFinding[]; project: Project }>) {
  const fix = useFixFiles(project.name)
  const git = useFixGit(project.name)
  const all = useFixAll(fix, git)
  const fixable = findings.filter(finding => finding.fixFiles.length > 0)
  const gitIssues = findings.filter(finding => isGitIssue(finding))
  const blockedDialog = <CommitBlockedDialog onClose={fix.handleCommitBlockedClose} output={fix.commitBlocked} />
  if (fixable.length === 0 && gitIssues.length === 0) return blockedDialog
  const slug = slugOf(project)
  return (
    <Card data-testid="fixes">
      <Card.Title>Fixes</Card.Title>
      <Card.Description>{summaryOf(fixable, gitIssues)}</Card.Description>
      <FixButtons hasFiles={fixable.length > 0} hasGit={gitIssues.length > 0} onAll={all.handleOpen} onFiles={fix.handleOpen} onGit={git.handleOpen} />
      {blockedDialog}
      <FixDialogs all={all} fix={fix} git={git} slug={slug} />
    </Card>
  )
}
