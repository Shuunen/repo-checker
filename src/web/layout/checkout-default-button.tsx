import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { ActionTrigger } from './action-trigger.tsx'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { useActionDialog } from './use-action-dialog.ts'

/**
 * The Checkout action: the button opens a confirmation, the checkout only runs when it is confirmed. The scan runs again after it worked
 * @param props the props
 * @param props.project the project whose clone is checked out
 * @returns the button and its dialog
 */
export function CheckoutDefaultButton({ project }: Readonly<{ project: Project }>) {
  const dialog = useActionDialog(project.name, 'checkout-default')
  const branch = project.github?.defaultBranch ?? 'default'
  const slug = slugOf(project)
  return (
    <>
      <ActionTrigger onPress={dialog.handleOpen} testId="action-checkout-default">
        Checkout {branch} branch
      </ActionTrigger>
      <ConfirmDialog confirmLabel="Checkout" dialog={dialog} heading={`Checkout ${branch} in ${slug}?`} prefix="checkout-default">
        {`The clone of ${slug} switches to ${branch}. No branch is deleted and nothing is lost, and it is refused if the clone has uncommitted files.`}
        {dialog.error !== undefined && <p data-testid="checkout-default-error">{dialog.error}</p>}
      </ConfirmDialog>
    </>
  )
}
