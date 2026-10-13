import { Card } from '@heroui/react'
import { kebabCase } from 'es-toolkit'
import { FactRow } from './fact-row.tsx'

/**
 * A titled card of facts, like the git state of the local clone
 * @param props the props
 * @param props.facts the facts
 * @param props.title the card title
 * @returns the card
 */
export function FactsCard({ facts, title }: Readonly<{ facts: readonly { label: string; value: string }[]; title: string }>) {
  return (
    <Card data-testid={`facts-${kebabCase(title)}`}>
      <Card.Title>{title}</Card.Title>
      <dl className="grid grid-cols-[14rem_1fr] gap-x-4 gap-y-1 text-sm">
        {facts.map(fact => (
          <FactRow key={fact.label} label={fact.label} value={fact.value} />
        ))}
      </dl>
    </Card>
  )
}
