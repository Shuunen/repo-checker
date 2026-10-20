import { Button } from '@heroui/react'
import type { ReactNode } from 'react'
import { useOpensAtOnce } from './use-action-dialog.ts'

/** What `ActionTrigger` shows and does */
interface ActionTriggerProps {
  /** The label */
  children: ReactNode
  /** Opens the dialog */
  onPress: () => void
  testId: string
}

/**
 * The button that opens the confirmation of an action, or nothing when the action was chosen in the Actions menu, which opens it at once
 * @param props the props
 * @returns the button
 */
export function ActionTrigger({ children, onPress, testId }: Readonly<ActionTriggerProps>) {
  if (useOpensAtOnce(onPress)) return undefined
  return (
    <Button data-testid={testId} onPress={onPress} size="sm" variant="outline">
      {children}
    </Button>
  )
}
