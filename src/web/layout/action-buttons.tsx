import { Button } from '@heroui/react'
import type { ActionKind } from '../../shared/action.ts'
import { actionLabels } from '../projects/rows.ts'

/**
 * One disabled button per action
 * @param props the props
 * @param props.actions the actions
 * @returns the buttons
 */
export function ActionButtons({ actions }: Readonly<{ actions: readonly ActionKind[] }>) {
  return (
    <span className="flex gap-2">
      {actions.map(action => (
        <Button data-testid={`action-${action}`} isDisabled key={action} size="sm" variant="outline">
          {actionLabels[action]}
        </Button>
      ))}
    </span>
  )
}
