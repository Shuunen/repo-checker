import { Switch } from '@heroui/react'

/** What `CommitToggle` shows and does */
interface CommitToggleProps {
  /** True when it is on */
  isCommit: boolean
  /** Called with the new state */
  onChange: (isCommit: boolean) => void
}

/**
 * The toggle that asks to commit and push the fixes once they pass the check of the project
 * @param props the props
 * @returns the toggle
 */
export function CommitToggle({ isCommit, onChange }: Readonly<CommitToggleProps>) {
  return (
    <Switch className="flex flex-row gap-2" data-testid="fix-commit" isSelected={isCommit} onChange={onChange}>
      <Switch.Content className="flex flex-row gap-2">
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        Auto commit fixes
      </Switch.Content>
    </Switch>
  )
}
