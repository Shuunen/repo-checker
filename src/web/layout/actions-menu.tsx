import { Button, Dropdown } from '@heroui/react'
import type { ActionKind } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { ActionItem } from './action-item.tsx'
import { OpensAtOnce } from './use-action-dialog.ts'
import { ChosenButton } from './chosen-button.tsx'
import { ProjectItems } from './project-items.tsx'
import { useMenuChoice } from './use-menu-choice.ts'

/**
 * The Actions menu of a row: a trigger that opens a menu next to it: Open project, Open on GitHub, one item per action, Archive on GitHub or Unarchive on GitHub, then Delete project apart in its own section, with its long label and its icon. The confirmation of the chosen action is mounted next to the trigger only once its item is chosen (a table cell is rendered twice by the table, so mounting every dialog of every row made the menu slow), so the dialog survives the menu closing, and it opens at once
 * @param props the props
 * @param props.actions the actions the project offers
 * @param props.isMajorOutdated true when a major dependency is outdated
 * @param props.project the project
 * @param props.target the folder of projects, where a clone goes
 * @returns the trigger, the menu and the dialog of the chosen action
 */
export function ActionsMenu({ actions, isMajorOutdated, project, target }: Readonly<{ actions: readonly ActionKind[]; isMajorOutdated: boolean; project: Project; target: string }>) {
  const { choice, handleChoice } = useMenuChoice(project)
  return (
    <>
      <Dropdown>
        <Button aria-label={`Actions of ${project.name}`} data-testid={`actions-${project.name}`} size="sm" variant="outline">
          Actions
        </Button>
        <Dropdown.Popover className="border border-foreground/20 bg-surface-tertiary!" placement="bottom end">
          <Dropdown.Menu onAction={handleChoice}>
            <Dropdown.Section>
              <ProjectItems actions={actions} isMajorOutdated={isMajorOutdated} project={project} />
            </Dropdown.Section>
            <Dropdown.Section className="mt-1 border-t border-foreground/20 pt-1">
              <ActionItem action="delete-project" project={project} />
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      {choice !== undefined && (
        <OpensAtOnce value>
          <ChosenButton actions={actions} chosen={choice.action} key={choice.count} project={project} target={target} />
        </OpensAtOnce>
      )}
    </>
  )
}
