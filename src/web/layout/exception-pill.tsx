import type { Pill } from '../projects/rows.ts'
import { PillView } from './pill-view.tsx'

/** What `ExceptionPill` shows and does */
interface ExceptionPillProps {
  /** The pill, undefined without GitHub repo */
  pill: Pill | undefined
}

/**
 * A pill that only shows when it is an exception: a dash without GitHub repo, nothing for the usual value (public, active), the pill otherwise (private, archived)
 * @param props the props
 * @returns the pill, a dash or nothing
 */
export function ExceptionPill({ pill }: Readonly<ExceptionPillProps>) {
  if (pill === undefined) return <span className="text-muted">—</span>
  return pill.isUsual === true ? undefined : <PillView pill={pill} />
}
