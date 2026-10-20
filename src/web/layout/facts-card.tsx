import { Card } from '@heroui/react'
import { kebabCase } from 'es-toolkit'
import { Fragment } from 'react'
import { dropQuietFacts } from '../projects/detail.ts'
import { CopyPathIcon } from './copy-path-icon.tsx'

/** What `FactsCard` shows and does */
interface FactsCardProps {
  /** The facts, a label and its value each */
  facts: readonly { label: string; value: string }[]
  /** The card title */
  title: string
}

/**
 * A titled card of facts, like the git state of the local clone. The empty facts (`none`) are left out, there is nothing to warn about. The path comes with an icon that copies it
 * @param props the props
 * @returns the card
 */
export function FactsCard({ facts, title }: Readonly<FactsCardProps>) {
  return (
    <Card data-testid={`facts-${kebabCase(title)}`}>
      <Card.Title>{title}</Card.Title>
      <dl className="flex flex-col gap-2 text-sm">
        {dropQuietFacts(facts).map(fact => (
          <Fragment key={fact.label}>
            <dt className="-mb-1 text-xs text-muted">{fact.label}</dt>
            <dd className="break-all" data-testid={`fact-${kebabCase(fact.label)}`}>
              {fact.value}
              {fact.label === 'Path' && <CopyPathIcon path={fact.value} />}
            </dd>
          </Fragment>
        ))}
      </dl>
    </Card>
  )
}
