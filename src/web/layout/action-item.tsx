import { Dropdown } from '@heroui/react'
import type { ProjectAction } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { actionMeta } from './action-meta.ts'

/**
 * One item of the menu: the icon and the long label of an action
 * @param props the props
 * @param props.action the action
 * @param props.project the project
 * @returns the item
 */
export function ActionItem({ action, project }: Readonly<{ action: ProjectAction; project: Project }>) {
  const { icon: Icon, label } = actionMeta(action, project)
  return (
    <Dropdown.Item className="data-[focused=true]:bg-background/50! data-[hovered=true]:bg-background/50!" data-testid={`menu-${action}`} id={action} textValue={label} variant={action === 'delete-project' ? 'danger' : 'default'}>
      <Icon aria-hidden="true" size={16} />
      {label}
    </Dropdown.Item>
  )
}
