import { Button } from '@heroui/react'
import type { ScanProject } from '../../shared/scan-event.ts'
import { type Bucket, bucketCounts, bucketLabel, buckets } from '../projects/health.ts'
import type { summaryTiles } from '../projects/filters.ts'
import { HealthFacts } from './health-facts.tsx'

/** The color of each bucket, on the bar and on its legend dot */
const bucketColors: Readonly<Record<Bucket, string>> = { error: 'bg-danger', info: 'bg-accent', quiet: 'bg-default', warning: 'bg-warning' }

/** What `HealthBar` shows and does */
interface HealthBarProps {
  /** The selected bucket, none when undefined */
  active: Bucket | undefined
  /** Called with the bucket clicked, or undefined when the selected one is clicked again */
  onSelect: (bucket: Bucket | undefined) => void
  projects: readonly ScanProject[]
  tiles: ReturnType<typeof summaryTiles>
}

/**
 * The health of the listed projects in one bar: one segment per bucket (every project counted once, by its worst finding), a legend of buttons that filter the table, and the facts that need action apart from the severity
 * @param props the props
 * @returns the bar, or nothing before the first project
 */
export function HealthBar({ active, onSelect, projects, tiles }: Readonly<HealthBarProps>) {
  const counts = bucketCounts(projects)
  const shown = buckets.filter(bucket => counts[bucket] > 0)
  if (shown.length === 0) return undefined
  return (
    <section aria-label="Health of the projects" className="flex flex-col gap-3" data-testid="health-bar">
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {shown.map(bucket => (
          <div className={bucketColors[bucket]} data-testid={`segment-${bucket}`} key={bucket} style={{ flexGrow: counts[bucket] }} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {shown.map(bucket => (
          <Button aria-pressed={active === bucket} data-testid={`bucket-${bucket}`} key={bucket} onPress={() => onSelect(active === bucket ? undefined : bucket)} size="sm" variant={active === bucket ? 'secondary' : 'outline'}>
            <span className={`size-2 rounded-full ${bucketColors[bucket]}`} />
            {bucketLabel(bucket, counts[bucket])}
          </Button>
        ))}
        <HealthFacts tiles={tiles} />
      </div>
    </section>
  )
}
