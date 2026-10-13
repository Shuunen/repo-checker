import { Button, Table } from '@heroui/react'

/**
 * The action cell of a project row. Actions come in a later step, so the button is disabled
 * @param props the props
 * @param props.label the action label, undefined when the row has no action
 * @returns the cell
 */
export function ActionCell({ label }: Readonly<{ label: string | undefined }>) {
  return <Table.Cell>{label !== undefined && <Button isDisabled size="sm" variant="ghost">{`${label} →`}</Button>}</Table.Cell>
}
