import { Chip } from '@heroui/react'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { severityColor } from '../projects/rows.ts'

/**
 * The first line of a finding: its rule id, colored by severity, then its message
 * @param props the props
 * @param props.finding the finding
 * @returns the line
 */
export function FindingHead({ finding }: Readonly<{ finding: ScanFinding }>) {
  return (
    <span className="flex items-center gap-2">
      <Chip color={severityColor[finding.severity]} size="sm">
        {finding.ruleId}
      </Chip>
      {finding.message}
    </span>
  )
}
