import type { ScanFinding } from '../../shared/scan-event.ts'

/**
 * The message of a finding, a link when the finding has an url
 * @param props the props
 * @param props.finding the finding
 * @returns the message
 */
export function FindingMessage({ finding }: Readonly<{ finding: ScanFinding }>) {
  if (finding.url === undefined) return finding.message
  return (
    <a className="text-accent underline" href={finding.url} rel="noreferrer" target="_blank">
      {finding.message}
    </a>
  )
}
