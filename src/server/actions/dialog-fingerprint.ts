import { createHash } from 'node:crypto'

/**
 * Fingerprint what a dialog listed, so the action can be refused when it is not what the user saw any more
 * @param value what the dialog listed, anything JSON can hold
 * @returns a hash of it
 * @example fingerprintOf(['feature', 'fix'])
 */
export function fingerprintOf(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

/**
 * The reason an action is refused when its fingerprint does not match any more
 * @param what what changed, with its verb, like `the local branches of the clone are`
 * @param done what was not done, like `deleted`
 * @returns the reason to show
 * @example staleReason('the fixes are', 'written') // 'the fixes are not what the dialog listed any more, nothing was written, open the dialog again'
 */
export function staleReason(what: string, done: string) {
  return `${what} not what the dialog listed any more, nothing was ${done}, open the dialog again`
}
