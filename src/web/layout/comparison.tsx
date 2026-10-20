import { Check, X } from 'lucide-react'

/** What `Comparison` shows and does */
interface ComparisonProps {
  /** True when the two values are the same */
  isEqual: boolean
  /** The test id of the badge */
  testId: string
}

/**
 * How two values compare: equal in green with a check, different in orange with a cross
 * @param props the props
 * @returns the badge
 */
export function Comparison({ isEqual, testId }: Readonly<ComparisonProps>) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${isEqual ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`} data-testid={testId}>
      {isEqual ? <Check aria-hidden="true" size={12} strokeWidth={2.5} /> : <X aria-hidden="true" size={12} strokeWidth={2.5} />}
      {isEqual ? 'Equal' : 'Different'}
    </span>
  )
}
