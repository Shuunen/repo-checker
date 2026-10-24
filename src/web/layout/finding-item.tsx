import { Chip } from '@heroui/react'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { fixText } from '../projects/detail.ts'
import { severityColor } from '../projects/rows.ts'

/** What `FindingItem` shows and does */
interface FindingItemProps {
  /** The finding */
  finding: ScanFinding
}

/**
 * One finding: its rule id colored by severity, its message and, when it has a fix, the files the fix would change
 * @param props the props
 * @returns the list item
 */
export function FindingItem({ finding }: Readonly<FindingItemProps>) {
  const fix = fixText(finding)
  return (
    <li className="flex flex-col gap-1" data-testid={`finding-${finding.ruleId}`}>
      <span className="flex items-center gap-2">
        <Chip color={severityColor[finding.severity]} size="sm">
          {finding.ruleId}
        </Chip>
        {finding.message}
      </span>
      {fix !== undefined && <span className="text-sm text-muted">{fix}</span>}
    </li>
  )
}
