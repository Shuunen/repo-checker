/**
 * Small text helpers shared by the CLI, the server and the web app.
 * @module
 */

/**
 * Say a count with its noun, singular or plural
 * @param count the count
 * @param noun the singular noun
 * @returns like `1 fork` or `30 forks`
 * @example plural(30, 'fork') // '30 forks'
 */
export function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}
