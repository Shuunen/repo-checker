import { Card } from '@heroui/react'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { findingGroups } from '../projects/detail.ts'
import { FindingItem } from './finding-item.tsx'

/**
 * Every finding of a project, grouped by origin, with what to do about it
 * @param props the props
 * @param props.findings the findings
 * @returns the card
 */
export function FindingsCard({ findings }: Readonly<{ findings: readonly ScanFinding[] }>) {
  const groups = findingGroups(findings)
  return (
    <Card data-testid="findings">
      <Card.Title>Findings</Card.Title>
      {groups.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center" data-testid="all-clear">
          <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-success/15 text-3xl text-success">
            ✓
          </span>
          <p className="text-lg font-medium">All good</p>
          <Card.Description>Every rule passes. Nothing to fix, nothing to report.</Card.Description>
        </div>
      )}
      {groups.map(group => (
        <section key={group.title}>
          <h2 className="mb-2 font-medium">{group.title}</h2>
          <ul className="flex flex-col gap-3">
            {group.findings.map(finding => (
              <FindingItem finding={finding} key={`${finding.ruleId}-${finding.message}`} />
            ))}
          </ul>
        </section>
      ))}
    </Card>
  )
}
