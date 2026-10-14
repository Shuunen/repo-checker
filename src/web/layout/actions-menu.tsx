import { Button, Dropdown } from '@heroui/react'
import type { ActionKind } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { ActionItem } from './action-item.tsx'
import { ActionButton } from './action-button.tsx'
import { DeleteProjectButton } from './delete-project-button.tsx'
import { useChosenAction } from './use-chosen-action.ts'

/**
 * The Actions menu of a row: a trigger that opens a menu next to it, one item per action then Delete project with its long label and its icon. The confirmation of each action lives in its own button, mounted hidden next to the trigger only once its item is chosen (a table cell is rendered twice by the table, so mounting every dialog of every row made the menu slow) so the dialog survives the menu closing: the item presses that button
 * @param props the props
 * @param props.actions the actions the project offers
 * @param props.project the project
 * @param props.target the folder of projects, where a clone goes
 * @returns the trigger, the menu and the hidden buttons
 */
export function ActionsMenu({ actions, project, target }: Readonly<{ actions: readonly ActionKind[]; project: Project; target: string }>) {
  const { chosen, handleAction, holder } = useChosenAction()
  return (
    <>
      <Dropdown>
        <Button aria-label={`Actions of ${project.name}`} data-testid={`actions-${project.name}`} size="sm" variant="outline">
          Actions
        </Button>
        <Dropdown.Popover className="border border-foreground/20 bg-surface-tertiary!" placement="bottom end">
          <Dropdown.Menu onAction={handleAction}>
            {actions.map(action => (
              <ActionItem action={action} key={action} project={project} />
            ))}
            <ActionItem action="delete-project" project={project} />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      <span className="hidden" ref={holder}>
        {chosen === 'delete-project' && <DeleteProjectButton project={project} />}
        {chosen !== undefined && chosen !== 'delete-project' && actions.includes(chosen) && <ActionButton action={chosen} project={project} target={target} />}
      </span>
    </>
  )
}
