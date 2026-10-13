import { Card } from '@heroui/react'
import type { ScanProject } from '../../shared/scan-event.ts'
import { summaryTiles } from '../projects/filters.ts'

/**
 * The summary tiles: at risk, with file errors, not cloned, pristine forks
 * @param props the props
 * @param props.projects every project checked so far, whatever the filter
 * @returns the tiles
 */
export function SummaryTiles({ projects }: Readonly<{ projects: readonly ScanProject[] }>) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {summaryTiles(projects).map(tile => (
        <Card data-testid={`tile-${tile.id}`} key={tile.id}>
          <Card.Description>{tile.label}</Card.Description>
          <Card.Title className={tile.isAlarming && tile.value > 0 ? 'text-2xl text-danger' : 'text-2xl'}>{tile.value}</Card.Title>
        </Card>
      ))}
    </div>
  )
}
