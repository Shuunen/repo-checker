import { Button } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { CheckoutDefaultDialog } from './checkout-default-dialog.tsx'
import { useActionDialog } from './use-action-dialog.ts'

/**
 * The Checkout action: the button opens a confirmation, the checkout only runs when it is confirmed. The scan runs again after it worked
 * @param props the props
 * @param props.isLabelled true for the long label of the project page, like `Checkout master branch`, instead of the short `Master` of a row
 * @param props.project the project whose clone is checked out
 * @returns the button and its dialog
 */
export function CheckoutDefaultButton({ isLabelled = false, project }: Readonly<{ isLabelled?: boolean; project: Project }>) {
  const dialog = useActionDialog(project.name, 'checkout-default')
  const branch = project.github?.defaultBranch ?? 'default'
  const short = branch.charAt(0).toUpperCase() + branch.slice(1)
  return (
    <>
      <Button data-testid="action-checkout-default" onPress={dialog.handleOpen} size="sm" variant="outline">
        {isLabelled ? `Checkout ${branch} branch` : short}
      </Button>
      <CheckoutDefaultDialog branch={branch} error={dialog.error} isOpen={dialog.isOpen} isPending={dialog.isPending} onCancel={dialog.handleClose} onConfirm={dialog.handleConfirm} onOpenChange={dialog.handleOpenChange} slug={slugOf(project)} />
    </>
  )
}
