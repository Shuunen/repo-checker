/** What `GitList` shows and does */
interface GitListProps {
  /** The items */
  items: readonly string[]
  /** The test id of the list */
  testId: string
  /** What the list says */
  title: string
}

/**
 * A list of what the git fixes delete, nothing when there is none
 * @param props the props
 * @returns the list, or nothing
 */
export function GitList({ items, testId, title }: Readonly<GitListProps>) {
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
