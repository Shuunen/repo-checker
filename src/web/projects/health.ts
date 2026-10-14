import type { ScanFinding, ScanProject } from '../../shared/scan-event.ts'
import { plural } from '../../shared/text.ts'

/** The health buckets, the worst first: a project belongs to the bucket of its worst finding, or `quiet` without finding */
export const buckets = ['error', 'warning', 'info', 'quiet'] as const

/** One health bucket */
export type Bucket = (typeof buckets)[number]

/**
 * The bucket of a project: its worst severity, or `quiet` when it has no finding
 * @param findings the findings of the project
 * @returns the bucket
 * @example worstBucket([]) // 'quiet'
 */
export function worstBucket(findings: readonly ScanFinding[]): Bucket {
  return buckets.find(bucket => bucket === 'quiet' || findings.some(finding => finding.severity === bucket)) ?? 'quiet'
}

/**
 * Count the projects of each bucket, every project is counted once
 * @param results the project results
 * @returns how many projects per bucket
 * @example bucketCounts(state.projects).error // 12
 */
export function bucketCounts(results: readonly ScanProject[]): Readonly<Record<Bucket, number>> {
  const counts: Record<Bucket, number> = { error: 0, info: 0, quiet: 0, warning: 0 }
  for (const result of results) counts[worstBucket(result.findings)] += 1
  return counts
}

/**
 * Say how many projects a bucket holds, like the health pill of a row does
 * @param bucket the bucket
 * @param count how many projects
 * @returns like `12 errors`, `1 warning` or `32 all good`
 * @example bucketLabel('quiet', 32) // '32 all good'
 */
export function bucketLabel(bucket: Bucket, count: number) {
  return bucket === 'quiet' ? `${count} all good` : plural(count, bucket)
}
