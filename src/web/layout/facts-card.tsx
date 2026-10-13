import { Card } from '@heroui/react'
import { kebabCase } from 'es-toolkit'
import { Fragment } from 'react'

/**
 * A titled card of facts, like the git state of the local clone
 * @param props the props
 * @param props.facts the facts, a label and its value each
 * @param props.title the card title
 * @returns the card
 */
export function FactsCard({ facts, title }: Readonly<{ facts: readonly { label: string; value: string }[]; title: string }>) {
  return (
    <Card data-testid={`facts-${kebabCase(title)}`}>
      <Card.Title>{title}</Card.Title>
      <dl className="grid grid-cols-[14rem_1fr] gap-x-4 gap-y-1 text-sm">
        {facts.map(fact => (
          <Fragment key={fact.label}>
            <dt className="text-muted">{fact.label}</dt>
            <dd className="break-all" data-testid={`fact-${kebabCase(fact.label)}`}>
              {fact.value}
            </dd>
          </Fragment>
        ))}
      </dl>
    </Card>
  )
}
