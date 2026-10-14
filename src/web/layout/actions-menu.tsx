import { Button, Dropdown } from '@heroui/react'
import type { ActionKind } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { ActionItem } from './action-item.tsx'
import { ArchiveItem } from './archive-item.tsx'
import { ChosenButton } from './chosen-button.tsx'
import { LinkItem } from './link-item.tsx'
import { useMenuChoice } from './use-menu-choice.ts'

/**
 * The Actions menu of a row: a trigger that opens a menu next to it: Open project, Open on GitHub, one item per action, Archive on GitHub or Unarchive on GitHub, then Delete project apart in its own section, with its long label and its icon. The confirmation of each action lives in its own button, mounted hidden next to the trigger only once its item is chosen (a table cell is rendered twice by the table, so mounting every dialog of every row made the menu slow) so the dialog survives the menu closing: the item presses that button
 * @param props the props
 * @param props.actions the actions the project offers
 * @param props.project the project
 * @param props.target the folder of projects, where a clone goes
 * @returns the trigger, the menu and the hidden buttons
 */
export function ActionsMenu({ actions, project, target }: Readonly<{ actions: readonly ActionKind[]; project: Project; target: string }>) {
  const { chosen, handleChoice, holder } = useMenuChoice(project)
  return (
    <>
      <Dropdown>
        <Button aria-label={`Actions of ${project.name}`} data-testid={`actions-${project.name}`} size="sm" variant="outline">
          Actions
        </Button>
        <Dropdown.Popover className="border border-foreground/20 bg-surface-tertiary!" placement="bottom end">
          <Dropdown.Menu onAction={handleChoice}>
            <Dropdown.Section>
              <LinkItem icon="M5 12h14M13 6l6 6-6 6" id="open-project" label="Open project" />
              {project.github !== undefined && <LinkItem icon="M14 4h6v6M20 4l-9 9M10 6H5v13h13v-5" id="open-github" label="Open on GitHub" />}
              {actions.map(action => (
                <ActionItem action={action} key={action} project={project} />
              ))}
              <ArchiveItem project={project} />
            </Dropdown.Section>
            <Dropdown.Section className="mt-1 border-t border-foreground/20 pt-1">
              <ActionItem action="delete-project" project={project} />
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      <span className="hidden" ref={holder}>
        <ChosenButton actions={actions} chosen={chosen} project={project} target={target} />
      </span>
    </>
  )
}
