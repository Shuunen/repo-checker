import { Card } from '@heroui/react'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { findingGroups } from './detail.ts'
import { FindingItem } from './finding-item.tsx'

/** What `FindingsCard` shows and does */
interface FindingsCardProps {
  /** The findings */
  findings: readonly ScanFinding[]
  /** The repo name of the project */
  projectName: string
}

/**
 * Every finding of a project, grouped by origin, with what to do about it
 * @param props the props
 * @returns the card
 */
export function FindingsCard({ findings, projectName }: Readonly<FindingsCardProps>) {
  const groups = findingGroups(findings)
  return (
    <Card data-testid="findings">
      <Card.Title>Findings</Card.Title>
      {groups.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center" data-testid="all-clear">
          <span aria-hidden="true" className="bg-success/15 text-success flex size-14 items-center justify-center rounded-full text-3xl">
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
              <FindingItem finding={finding} key={`${finding.ruleId}-${finding.message}`} projectName={projectName} />
            ))}
          </ul>
        </section>
      ))}
    </Card>
  )
}
