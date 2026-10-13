import type { LocalClone } from '../../shared/project.ts'
import { unsavedGroups } from '../projects/detail.ts'

/**
 * The work a clone holds that exists nowhere else, item by item, so a dialog can show exactly what an action concerns
 * @param props the props
 * @param props.local the clone
 * @returns the lists
 */
export function UnsavedList({ local }: Readonly<{ local: LocalClone }>) {
  return (
    <div data-testid="unsaved-list">
      {unsavedGroups(local).map(group => (
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
