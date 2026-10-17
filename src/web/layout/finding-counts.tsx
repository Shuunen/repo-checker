import { Chip } from '@heroui/react'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { findingCounts } from '../projects/detail.ts'

/**
 * The findings of a project counted by severity, one chip each, nothing when there is no finding
 * @param props the props
 * @param props.findings the findings
 * @returns the chips
 */
export function FindingCounts({ findings }: Readonly<{ findings: readonly ScanFinding[] }>) {
  return (
    <span className="flex gap-1" data-testid="finding-counts">
      {findingCounts(findings).map(count => (
        <Chip color={count.color} key={count.severity} size="sm">
          {count.label}
        </Chip>
      ))}
    </span>
  )
}
