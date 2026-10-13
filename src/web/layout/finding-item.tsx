import type { ScanFinding } from '../../shared/scan-event.ts'
import { fixText } from '../projects/detail.ts'
import { FindingHead } from './finding-head.tsx'

/**
 * One finding with its message and, when it has a fix, the files the fix would change
 * @param props the props
 * @param props.finding the finding
 * @returns the list item
 */
export function FindingItem({ finding }: Readonly<{ finding: ScanFinding }>) {
  const fix = fixText(finding)
  return (
    <li className="flex flex-col gap-1" data-testid={`finding-${finding.ruleId}`}>
      <FindingHead finding={finding} />
      {fix !== undefined && <span className="text-sm text-muted">{fix}</span>}
    </li>
  )
}
