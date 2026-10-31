import { Button } from '@heroui/react'

/** What the buttons need */
interface FixButtonsProps {
  /** Opens the fix of everything */
  onAll: () => void
  /** Opens the file fixes */
  onFiles: () => void
  /** Opens the git fixes */
  onGit: () => void
  /** True when a finding has a file fix */
  hasFiles: boolean
  /** True when a finding is a git issue */
  hasGit: boolean
}

/**
 * The buttons of the fixes: the one that fixes everything, blue because it is the main one, only when both kinds of issue exist, then the two others
 * @param props the props
 * @returns the buttons
 */
export function FixButtons({ hasFiles, hasGit, onAll, onFiles, onGit }: Readonly<FixButtonsProps>) {
  return (
    <span className="flex flex-wrap gap-2">
      {hasFiles && hasGit && (
        <Button data-testid="action-fix-all" onPress={onAll} size="sm" variant="primary">
          Fix all issues
        </Button>
      )}
      {hasFiles && (
        <Button data-testid="action-fix-files" onPress={onFiles} size="sm" variant="outline">
          Fix the files
        </Button>
      )}
      {hasGit && (
        <Button data-testid="action-fix-git" onPress={onGit} size="sm" variant="outline">
          Fix git issues
        </Button>
      )}
    </span>
  )
}
