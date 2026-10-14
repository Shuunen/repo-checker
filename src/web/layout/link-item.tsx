import { Dropdown } from '@heroui/react'

/**
 * One item of the Actions menu that goes somewhere instead of opening a confirmation: the project view or the repo on GitHub, the menu handles the choice by its id
 * @param props the props
 * @param props.icon the path of the icon, drawn on a 24px grid
 * @param props.id the key the menu receives when the item is chosen
 * @param props.label the label
 * @returns the item
 */
export function LinkItem({ icon, id, label }: Readonly<{ icon: string; id: string; label: string }>) {
  return (
    <Dropdown.Item className="data-[focused=true]:bg-background/50! data-[hovered=true]:bg-background/50!" data-testid={`menu-${id}`} id={id} textValue={label}>
      <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
        <path d={icon} />
      </svg>
      {label}
    </Dropdown.Item>
  )
}
