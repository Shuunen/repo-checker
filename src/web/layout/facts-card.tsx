import { Card, Chip } from '@heroui/react'
import { kebabCase } from 'es-toolkit'
import { Fragment } from 'react'
import { foldQuietFacts } from '../projects/detail.ts'

/**
 * A titled card of facts, like the git state of the local clone. The empty facts (`none`) fold into one all clear line instead of one row each
 * @param props the props
 * @param props.facts the facts, a label and its value each
 * @param props.title the card title
 * @returns the card
 */
export function FactsCard({ facts, title }: Readonly<{ facts: readonly { label: string; value: string }[]; title: string }>) {
  const { quiet, shown } = foldQuietFacts(facts)
  return (
    <Card data-testid={`facts-${kebabCase(title)}`}>
      <Card.Title>{title}</Card.Title>
      <dl className="flex flex-col gap-2 text-sm">
        {shown.map(fact => (
          <Fragment key={fact.label}>
            <dt className="-mb-1 text-xs text-muted">{fact.label}</dt>
            <dd className="break-all" data-testid={`fact-${kebabCase(fact.label)}`}>
              {fact.value}
            </dd>
          </Fragment>
        ))}
      </dl>
      {quiet.length > 0 && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted" data-testid={`quiet-${kebabCase(title)}`}>
          <Chip color="success" size="sm">
            clean
          </Chip>
          {`no ${quiet.join(', ')}`}
        </p>
      )}
    </Card>
  )
}
