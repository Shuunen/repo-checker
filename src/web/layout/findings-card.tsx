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
      {groups.length === 0 && <Card.Description>Nothing to report</Card.Description>}
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
