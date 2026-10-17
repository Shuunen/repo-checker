import { Dropdown } from '@heroui/react'
import type { LucideIcon } from 'lucide-react'

/**
 * One item of the Actions menu that goes somewhere instead of opening a confirmation: the project view or the repo on GitHub, the menu handles the choice by its id
 * @param props the props
 * @param props.icon the icon component
 * @param props.id the key the menu receives when the item is chosen
 * @param props.label the label
 * @returns the item
 */
export function LinkItem({ icon: Icon, id, label }: Readonly<{ icon: LucideIcon; id: string; label: string }>) {
  return (
    <Dropdown.Item className="data-[focused=true]:bg-background/50! data-[hovered=true]:bg-background/50!" data-testid={`menu-${id}`} id={id} textValue={label}>
      <Icon aria-hidden="true" size={16} />
      {label}
    </Dropdown.Item>
  )
}
