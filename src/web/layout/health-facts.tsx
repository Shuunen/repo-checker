import type { summaryTiles } from '../projects/filters.ts'

/** What `HealthFacts` shows and does */
interface HealthFactsProps {
  /** The facts */
  tiles: ReturnType<typeof summaryTiles>
}

/**
 * The facts about every project that need action apart from the severity: at risk, not cloned, pristine forks
 * @param props the props
 * @returns the line of facts
 */
export function HealthFacts({ tiles }: Readonly<HealthFactsProps>) {
  return (
    <p className="ml-auto flex gap-3 text-sm text-muted">
      {tiles
        .filter(tile => tile.id !== 'errors')
        .map(tile => (
          <span className={tile.isAlarming && tile.value > 0 ? 'text-danger' : undefined} data-testid={`tile-${tile.id}`} key={tile.id}>
            {tile.label} {tile.value}
          </span>
        ))}
    </p>
  )
}
