import { AlertDialog, Button } from '@heroui/react'

/** What the dialog shows and does */
interface CommitBlockedDialogProps {
  /** The output of the failing check, undefined when the dialog is closed */
  output: string | undefined
  /** Close the dialog */
  onClose: () => void
}

/**
 * Tells that the automatic commit was prevented because the `check` script of the project failed: the fixes stay in the files for the user to look at
 * @param props the props
 * @param props.onClose closes the dialog
 * @param props.output the output of the failing check
 * @returns the dialog
 */
export function CommitBlockedDialog({ onClose, output }: Readonly<CommitBlockedDialogProps>) {
  return (
    <AlertDialog isOpen={output !== undefined} onOpenChange={onClose}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="max-w-4xl">
            <AlertDialog.Header>
              <AlertDialog.Heading>Auto commit prevented</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto" data-testid="commit-blocked-body">
              <p>The fixes are written, but nothing was committed or pushed because pnpm check failed. The changes are left in the files for you to review and fix.</p>
              <pre className="overflow-x-auto text-xs" data-testid="commit-blocked-output">
                {output}
              </pre>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button data-testid="commit-blocked-close" onPress={onClose} variant="primary">
                Understood
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  )
}
