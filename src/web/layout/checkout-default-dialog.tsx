import { ConfirmDialog } from './confirm-dialog.tsx'

/** What the dialog shows and does */
interface CheckoutDefaultDialogProps {
  /** The default branch */
  branch: string
  /** Why the checkout was refused or failed, undefined before */
  error: string | undefined
  /** True when the dialog is shown */
  isOpen: boolean
  /** True while the server checks out */
  isPending: boolean
  /** Close the dialog without checking out */
  onCancel: () => void
  /** Check out */
  onConfirm: () => void
  /** Called with the new state when the dialog opens or closes */
  onOpenChange: (isOpen: boolean) => void
  /** The `owner/name` of the repo */
  slug: string
}

/**
 * The confirmation before a checkout of the default branch: what will happen, and why it failed if it did. Nothing happens until Checkout is pressed
 * @param props the props
 * @param props.branch the default branch
 * @param props.error why the checkout failed, undefined before
 * @param props.isOpen true when the dialog is shown
 * @param props.isPending true while checking out
 * @param props.onCancel closes the dialog
 * @param props.onConfirm checks out
 * @param props.onOpenChange called when the dialog opens or closes
 * @param props.slug the `owner/name` of the repo
 * @returns the dialog
 */
export function CheckoutDefaultDialog({ branch, error, isOpen, isPending, onCancel, onConfirm, onOpenChange, slug }: Readonly<CheckoutDefaultDialogProps>) {
  return (
    <ConfirmDialog canConfirm confirmLabel="Checkout" heading={`Checkout ${branch} in ${slug}?`} isDanger={false} isOpen={isOpen} isPending={isPending} isWide={false} onCancel={onCancel} onConfirm={onConfirm} onOpenChange={onOpenChange} prefix="checkout-default">
      {`The clone of ${slug} switches to ${branch}. No branch is deleted and nothing is lost, and it is refused if the clone has uncommitted files.`}
      {error !== undefined && <p data-testid="checkout-default-error">{error}</p>}
    </ConfirmDialog>
  )
}
