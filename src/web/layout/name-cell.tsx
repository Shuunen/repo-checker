import { Table } from '@heroui/react'
import { Link } from 'wouter'

/**
 * The name cell of a project row, a link to the project view
 * @param props the props
 * @param props.href the address of the project view
 * @param props.name the project name
 * @returns the cell
 */
export function NameCell({ href, name }: Readonly<{ href: string; name: string }>) {
  return (
    <Table.Cell className="font-medium">
      <Link data-testid={`open-${name}`} href={href}>
        {name}
      </Link>
    </Table.Cell>
  )
}
