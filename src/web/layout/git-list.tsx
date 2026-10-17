/**
 * A list of what the git fixes delete, nothing when there is none
 * @param props the props
 * @param props.items the items
 * @param props.testId the test id of the list
 * @param props.title what the list says
 * @returns the list, or nothing
 */
export function GitList({ items, testId, title }: Readonly<{ items: readonly string[]; testId: string; title: string }>) {
  if (items.length === 0) return undefined
  return (
    <div data-testid={testId}>
      <p>{title}</p>
      <ul className="list-disc pl-6">
        {items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
