import { Switch } from '@heroui/react'

/**
 * The toggle that asks to commit and push the fixes once they pass the check of the project
 * @param props the props
 * @param props.isCommit true when it is on
 * @param props.onChange called with the new state
 * @returns the toggle
 */
export function CommitToggle({ isCommit, onChange }: Readonly<{ isCommit: boolean; onChange: (isCommit: boolean) => void }>) {
  return (
    <Switch className="flex flex-row gap-2" data-testid="fix-commit" isSelected={isCommit} onChange={onChange}>
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      <Switch.Content>Auto commit fixes</Switch.Content>
    </Switch>
  )
}
