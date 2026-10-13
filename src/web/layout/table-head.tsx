import { Table } from '@heroui/react'

/**
 * The header row of the project table
 * @returns the header
 */
export function TableHead() {
  return (
    <Table.Header>
      <Table.Column isRowHeader>Project</Table.Column>
      <Table.Column>Status</Table.Column>
      <Table.Column>Branch</Table.Column>
      <Table.Column>Last push</Table.Column>
      <Table.Column>Action</Table.Column>
    </Table.Header>
  )
}
