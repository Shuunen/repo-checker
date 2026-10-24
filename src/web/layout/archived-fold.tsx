import { Button } from '@heroui/react'
import { plural } from '../../shared/text.ts'

/** What `ArchivedFold` shows and does */
interface ArchivedFoldProps {
  /** How many archived projects there are */
  count: number
  /** True when they are listed in the table */
  isShown: boolean
  /** Shows or hides them */
  onToggle: () => void
}

/**
 * The row under the table that folds the archived projects: it says how many they are and shows or hides them
 * @param props the props
 * @returns the row, or nothing when there is none
 */
export function ArchivedFold({ count, isShown, onToggle }: Readonly<ArchivedFoldProps>) {
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
