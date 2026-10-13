import { Button, Card } from '@heroui/react'
import type { FixPreview } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { plural } from '../../shared/text.ts'
import { slugOf } from '../projects/detail.ts'
import { FixFilesDialog } from './fix-files-dialog.tsx'
import { usePreviewedDialog } from './use-previewed-dialog.ts'

/**
 * The file fixes of a project: how many findings have a fix and in how many files, and the button that opens the diff to confirm. Nothing when no finding has a fix
 * @param props the props
 * @param props.findings the findings of the project
 * @param props.project the project
 * @returns the card, or nothing
 */
export function FixFilesCard({ findings, project }: Readonly<{ findings: readonly ScanFinding[]; project: Project }>) {
  const dialog = usePreviewedDialog<FixPreview>(project.name, 'fix-files', preview => preview.fingerprint)
  const fixable = findings.filter(finding => finding.fixFiles.length > 0)
  if (fixable.length === 0) return undefined
  return (
    <Card data-testid="fixes">
      <Card.Title>Fixes</Card.Title>
      <Card.Description>{`${plural(fixable.length, 'finding')} can be fixed by rewriting ${plural(new Set(fixable.flatMap(finding => finding.fixFiles)).size, 'file')}.`}</Card.Description>
      <Button data-testid="action-fix-files" onPress={dialog.handleOpen} size="sm" variant="outline">
        Fix the files
      </Button>
      <FixFilesDialog
        error={dialog.error}
        isLoading={dialog.isLoading}
        isOpen={dialog.isOpen}
        isPending={dialog.isPending}
        onCancel={dialog.handleClose}
        onConfirm={dialog.handleConfirm}
        onOpenChange={dialog.handleOpenChange}
        preview={dialog.preview}
        previewError={dialog.previewError}
        slug={slugOf(project)}
      />
    </Card>
  )
}
