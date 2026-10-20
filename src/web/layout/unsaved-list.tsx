import type { UnsavedGroup } from '../../shared/unsaved.ts'

/** What `UnsavedList` shows and does */
interface UnsavedListProps {
  /** The unsaved items, by kind */
  groups: readonly UnsavedGroup[]
}

/**
 * The work a clone holds that exists nowhere else, item by item, so a dialog can show exactly what an action concerns
 * @param props the props
 * @returns the lists
 */
export function UnsavedList({ groups }: Readonly<UnsavedListProps>) {
  return (
    <div data-testid="unsaved-list">
      {groups.map(group => (
        <section key={group.title}>
          <h3 className="font-medium">{group.title}</h3>
          <ul className="list-disc pl-5">
            {group.items.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
