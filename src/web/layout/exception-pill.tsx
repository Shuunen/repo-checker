import type { Pill } from '../projects/rows.ts'
import { PillView } from './pill-view.tsx'

/**
 * A pill that only shows when it is an exception: a dash without GitHub repo, nothing for the usual value (public, active), the pill otherwise (private, archived)
 * @param props the props
 * @param props.pill the pill, undefined without GitHub repo
 * @returns the pill, a dash or nothing
 */
export function ExceptionPill({ pill }: Readonly<{ pill: Pill | undefined }>) {
  if (pill === undefined) return <span className="text-muted">—</span>
  return pill.isUsual === true ? undefined : <PillView pill={pill} />
}
