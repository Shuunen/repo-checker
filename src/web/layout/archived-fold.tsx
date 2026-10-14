import { Button } from '@heroui/react'
import { plural } from '../../shared/text.ts'

/**
 * The row under the table that folds the archived projects with nothing to report: it says how many they are and shows or hides them
 * @param props the props
 * @param props.count how many archived projects have nothing to report
 * @param props.isShown true when they are listed in the table
 * @param props.onToggle shows or hides them
 * @returns the row, or nothing when there is none
 */
export function ArchivedFold({ count, isShown, onToggle }: Readonly<{ count: number; isShown: boolean; onToggle: () => void }>) {
  if (count === 0) return undefined
  return (
    <div className="flex items-center justify-between rounded-xl border border-separator px-4 py-2" data-testid="archived-fold">
      <p className="text-sm font-medium">{plural(count, 'archived project')}</p>
      <Button data-testid="archived-toggle" onPress={onToggle} size="sm" variant="ghost">
        {isShown ? 'Hide' : 'Show'}
      </Button>
    </div>
  )
}
