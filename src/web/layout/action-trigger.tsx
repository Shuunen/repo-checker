import { Button } from '@heroui/react'
import type { ReactNode } from 'react'
import { useOpensAtOnce } from './use-action-dialog.ts'

/**
 * The button that opens the confirmation of an action, or nothing when the action was chosen in the Actions menu, which opens it at once
 * @param props the props
 * @param props.children the label
 * @param props.onPress opens the dialog
 * @param props.testId the test id, like `action-clone`
 * @returns the button
 */
export function ActionTrigger({ children, onPress, testId }: Readonly<{ children: ReactNode; onPress: () => void; testId: string }>) {
  if (useOpensAtOnce(onPress)) return undefined
  return (
    <Button data-testid={testId} onPress={onPress} size="sm" variant="outline">
      {children}
    </Button>
  )
}
