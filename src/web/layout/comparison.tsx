/**
 * How two values compare: equal in green with a check, different in orange with a cross
 * @param props the props
 * @param props.isEqual true when the two values are the same
 * @param props.testId the test id of the badge
 * @returns the badge
 */
export function Comparison({ isEqual, testId }: Readonly<{ isEqual: boolean; testId: string }>) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${isEqual ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`} data-testid={testId}>
      <svg aria-hidden="true" fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="12">
        <path d={isEqual ? 'M5 12l5 5L20 7' : 'M6 6l12 12M18 6L6 18'} />
      </svg>
      {isEqual ? 'Equal' : 'Different'}
    </span>
  )
}
