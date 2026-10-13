import type { ScanFinding } from '../../shared/scan-event.ts'
import { FindingItem } from './finding-item.tsx'

/**
 * The findings of one origin, under its title
 * @param props the props
 * @param props.findings the findings
 * @param props.title where they come from
 * @returns the section
 */
export function FindingGroup({ findings, title }: Readonly<{ findings: readonly ScanFinding[]; title: string }>) {
  return (
    <section>
      <h2 className="mb-2 font-medium">{title}</h2>
      <ul className="flex flex-col gap-3">
        {findings.map(finding => (
          <FindingItem finding={finding} key={`${finding.ruleId}-${finding.message}`} />
        ))}
      </ul>
    </section>
  )
}
