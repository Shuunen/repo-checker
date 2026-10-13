import { Card } from '@heroui/react'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { offeredActions } from '../projects/detail.ts'
import { ActionButtons } from './action-buttons.tsx'

/**
 * The actions the findings offer. They are not built yet, so the buttons are disabled
 * @param props the props
 * @param props.findings the findings
 * @returns the card, or nothing when no action is offered
 */
export function ActionsCard({ findings }: Readonly<{ findings: readonly ScanFinding[] }>) {
  const actions = offeredActions(findings)
  if (actions.length === 0) return undefined
  return (
    <Card data-testid="actions">
      <Card.Title>Actions</Card.Title>
      <Card.Description>They are not built yet, so these buttons do nothing.</Card.Description>
      <ActionButtons actions={actions} />
    </Card>
  )
}
