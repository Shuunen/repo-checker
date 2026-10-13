import { AlertDialog, Button } from '@heroui/react'
import type { ReactNode } from 'react'

/** What the confirmation shows and does */
interface ConfirmDialogProps {
  /** False keeps the confirm button disabled, while the proof is being redone or when the action is refused */
  canConfirm: boolean
  /** What the dialog says: what will happen, why it is refused, what failed */
  children: ReactNode
  /** The label of the confirm button */
  confirmLabel: string
  /** The question the dialog asks */
  heading: string
  /** True for an action that destroys something, the confirm button is red */
  isDanger: boolean
  /** True for a dialog that shows a lot, like a diff: it is wider */
  isWide: boolean
  /** True when the dialog is shown */
  isOpen: boolean
  /** True while the server runs the action */
  isPending: boolean
  /** Close the dialog without running the action */
  onCancel: () => void
  /** Run the action */
  onConfirm: () => void
  /** Called with the new state when the dialog opens or closes */
  onOpenChange: (isOpen: boolean) => void
  /** The test ids start with it: `clone` gives `clone-dialog-body`, `clone-cancel` and `clone-confirm` */
  prefix: string
}

/**
 * The frame of every confirmation: a heading, what the dialog says, Cancel, and the confirm button. Nothing happens until the confirm button is pressed
 * @param props the props
 * @param props.canConfirm false keeps the confirm button disabled
 * @param props.children what the dialog says
 * @param props.confirmLabel the label of the confirm button
 * @param props.heading the question the dialog asks
 * @param props.isDanger true for an action that destroys something
 * @param props.isWide true for a dialog that shows a lot, like a diff
 * @param props.isOpen true when the dialog is shown
 * @param props.isPending true while the action runs
 * @param props.onCancel closes the dialog
 * @param props.onConfirm runs the action
 * @param props.onOpenChange called when the dialog opens or closes
 * @param props.prefix the start of the test ids
 * @returns the dialog
 */
export function ConfirmDialog({ canConfirm, children, confirmLabel, heading, isDanger, isOpen, isWide, isPending, onCancel, onConfirm, onOpenChange, prefix }: Readonly<ConfirmDialogProps>) {
  return (
    <AlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className={isWide ? 'max-w-4xl' : undefined}>
            <AlertDialog.Header>
              <AlertDialog.Heading>{heading}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto" data-testid={`${prefix}-dialog-body`}>
              {children}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button data-testid={`${prefix}-cancel`} isDisabled={isPending} onPress={onCancel} variant="tertiary">
                Cancel
              </Button>
              <Button data-testid={`${prefix}-confirm`} isDisabled={!canConfirm} isPending={isPending} onPress={onConfirm} variant={isDanger ? 'danger' : 'primary'}>
                {confirmLabel}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  )
}
