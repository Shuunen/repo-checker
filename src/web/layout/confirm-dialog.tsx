import { AlertDialog, Button } from '@heroui/react'
import type { ReactNode } from 'react'
import type { DialogControls } from './use-action-dialog.ts'

/** What the confirmation shows and does */
interface ConfirmDialogProps {
  /** What the dialog says: what will happen, why it is refused, what failed */
  children: ReactNode
  /** The label of the confirm button */
  confirmLabel: string
  /** The state of the dialog and what its buttons do */
  dialog: DialogControls
  /** What sits at the start of the footer, next to the buttons, like an option of the action */
  footerStart?: ReactNode
  /** The question the dialog asks */
  heading: string
  /** True when the action cannot run for a reason the page knows, the confirm button stays disabled */
  isBlocked?: boolean
  /** True for an action that destroys something, the confirm button is red */
  isDanger?: boolean
  /** True for a dialog that shows a lot, like a diff: it is wider */
  isWide?: boolean
  /** The test ids start with it: `clone` gives `clone-dialog-body`, `clone-cancel` and `clone-confirm` */
  prefix: string
}

/**
 * The frame of every confirmation: a heading, what the dialog says, Cancel, and the confirm button. Nothing happens until the confirm button is pressed
 * @param props the props
 * @returns the dialog
 */
export function ConfirmDialog({ children, confirmLabel, dialog, footerStart, heading, isBlocked = false, isDanger = false, isWide = false, prefix }: Readonly<ConfirmDialogProps>) {
  return (
    <AlertDialog isOpen={dialog.isOpen} onOpenChange={dialog.handleOpenChange}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className={isWide ? 'max-w-4xl' : ''}>
            <AlertDialog.Header>
              <AlertDialog.Heading>{heading}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto" data-testid={`${prefix}-dialog-body`}>
              {children}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              {footerStart !== undefined && <div className="mr-auto">{footerStart}</div>}
              <Button data-testid={`${prefix}-cancel`} isDisabled={dialog.isPending} onPress={dialog.handleClose} variant="tertiary">
                Cancel
              </Button>
              <Button data-testid={`${prefix}-confirm`} isDisabled={!dialog.canConfirm || isBlocked} isPending={dialog.isPending} onPress={dialog.handleConfirm} variant={isDanger ? 'danger' : 'primary'}>
                {confirmLabel}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  )
}
