import { Button, Card } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { plural } from '../../shared/text.ts'
import { slugOf } from '../projects/detail.ts'
import { CommitBlockedDialog } from './commit-blocked-dialog.tsx'
import { FixFilesDialog } from './fix-files-dialog.tsx'
import { useFixFiles } from './use-fix-files.ts'

/**
 * The file fixes of a project: how many findings have a fix and in how many files, and the button that opens the diff to confirm. Nothing when no finding has a fix, but the notice of a prevented commit, which stays until it is closed
 * @param props the props
 * @param props.findings the findings of the project
 * @param props.project the project
 * @returns the card, or nothing
 */
export function FixFilesCard({ findings, project }: Readonly<{ findings: readonly ScanFinding[]; project: Project }>) {
  const fix = useFixFiles(project.name)
  const fixable = findings.filter(finding => finding.fixFiles.length > 0)
  const blockedDialog = <CommitBlockedDialog onClose={fix.handleCommitBlockedClose} output={fix.commitBlocked} />
  if (fixable.length === 0) return blockedDialog
  return (
    <Card data-testid="fixes">
      <Card.Title>Fixes</Card.Title>
      <Card.Description>{`${plural(fixable.length, 'finding')} can be fixed by rewriting ${plural(new Set(fixable.flatMap(finding => finding.fixFiles)).size, 'file')}.`}</Card.Description>
      <Button data-testid="action-fix-files" onPress={fix.handleOpen} size="sm" variant="outline">
        Fix the files
      </Button>
      {blockedDialog}
      <FixFilesDialog slug={slugOf(project)} state={fix.dialogState} />
    </Card>
  )
}
