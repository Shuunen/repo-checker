import { Dropdown } from '@heroui/react'
import type { LucideIcon } from 'lucide-react'

/** What `LinkItem` shows and does */
interface LinkItemProps {
  /** The icon component */
  icon: LucideIcon
  /** The key the menu receives when the item is chosen */
  id: string
  /** The label */
  label: string
}

/**
 * One item of the Actions menu that goes somewhere instead of opening a confirmation: the project view or the repo on GitHub, the menu handles the choice by its id
 * @param props the props
 * @returns the item
 */
export function LinkItem({ icon: Icon, id, label }: Readonly<LinkItemProps>) {
  return (
    <Dropdown.Item className="data-[focused=true]:bg-background/50! data-[hovered=true]:bg-background/50!" data-testid={`menu-${id}`} id={id} textValue={label}>
      <Icon aria-hidden="true" size={16} />
      {label}
    </Dropdown.Item>
  )
}
