/**
 * Small text helpers shared by the CLI, the server and the web app.
 * @module
 */

/** Nouns ending like this take `es` in the plural: branch, stash, box */
const esEndings = /(?:ch|sh|[sxz])$/u

/**
 * Say a count with its noun, singular or plural
 * @param count the count
 * @param noun the singular noun
 * @returns like `1 fork`, `30 forks` or `2 branches`
 * @example plural(30, 'fork') // '30 forks'
 */
export function plural(count: number, noun: string) {
  if (count === 1) return `${count} ${noun}`
  return `${count} ${noun}${esEndings.test(noun) ? 'es' : 's'}`
}

/**
 * Read the message of anything thrown, an Error or not
 * @param error what was thrown
 * @returns the message
 * @example errorMessage(new Error('boom')) // 'boom'
 */
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
