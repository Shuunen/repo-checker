import { Card } from '@heroui/react'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { findingGroups } from '../projects/detail.ts'
import { FindingGroup } from './finding-group.tsx'

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
        <FindingGroup findings={group.findings} key={group.title} title={group.title} />
      ))}
    </Card>
  )
}
