import { Dropdown } from '@heroui/react'
import type { ProjectAction } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { actionMeta } from './action-meta.ts'

/** What `ActionItem` shows and does */
interface ActionItemProps {
  /** The action */
  action: ProjectAction
  /** The project */
  project: Project
}

/**
 * One item of the menu: the icon and the long label of an action
 * @param props the props
 * @returns the item
 */
export function ActionItem({ action, project }: Readonly<ActionItemProps>) {
  const { icon: Icon, label } = actionMeta(action, project)
  return (
    <Dropdown.Item className="data-[focused=true]:bg-background/50! data-[hovered=true]:bg-background/50!" data-testid={`menu-${action}`} id={action} textValue={label} variant={action === 'delete-project' ? 'danger' : 'default'}>
      <Icon aria-hidden="true" size={16} />
      {label}
    </Dropdown.Item>
  )
}
