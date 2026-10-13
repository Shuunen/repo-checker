import { kebabCase } from 'es-toolkit'

/**
 * One fact of a card: its label, then its value
 * @param props the props
 * @param props.label what it is
 * @param props.value its value
 * @returns the term and its description
 */
export function FactRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="break-all" data-testid={`fact-${kebabCase(label)}`}>
        {value}
      </dd>
    </>
  )
}
