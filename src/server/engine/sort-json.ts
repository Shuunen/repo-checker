/**
 * Keep the json files a fix changed nicely sorted.
 * @module
 */
/** The `$schema` key goes first, the others follow alphabetically */
const schemaKey = '$schema'

/** The key of a `package.json` whose content keeps its order, the conditions of an export are matched in order so sorting them can break the package */
const orderedKey = 'exports'

/**
 * Sort the keys of every object, `$schema` first, arrays keep their order
 * @param value the parsed json
 * @param keepOrdered true to leave the content of the `exports` key as is, for a `package.json`
 * @returns the sorted copy
 */
function sortKeys(value: unknown, keepOrdered = false): unknown {
  if (Array.isArray(value)) return value.map(item => sortKeys(item))
  if (typeof value !== 'object' || value === null) return value
  const entries = Object.entries(value).toSorted(([first], [second]) => Number(second === schemaKey) - Number(first === schemaKey) || first.localeCompare(second, 'en'))
  return Object.fromEntries(entries.map(([key, item]) => [key, keepOrdered && key === orderedKey ? item : sortKeys(item)]))
}

/**
 * Whether a file is a `package.json`
 * @param file the file path, relative to the project folder
 * @returns true for `package.json` at any depth
 */
function isPackageJson(file: string) {
  return file === 'package.json' || file.endsWith('/package.json')
}

/**
 * The parsed json of a text and its sorted copy
 * @param file the file path, relative to the project folder
 * @param text the json text
 * @returns the parsed value and its sorted copy
 */
function sortedOf(file: string, text: string) {
  const parsed: unknown = JSON.parse(text)
  const sorted = sortKeys(parsed, isPackageJson(file))
  return { parsed, sorted: sorted as unknown }
}

/**
 * Whether the keys of a json text are already in order
 * @param file the file path, relative to the project folder
 * @param text the json text
 * @returns true when sorting changes nothing
 */
function isSorted(file: string, text: string) {
  const { parsed, sorted } = sortedOf(file, text)
  return JSON.stringify(parsed) === JSON.stringify(sorted)
}

/**
 * Sort a json file once the fixes changed it, The keys are sorted alphabetically, `$schema` first, and the content of the `exports` of a `package.json` keeps its order. A `package.json` is always sorted, the other files only when they were sorted before, so a file ordered by hand is not reshuffled. A text that is not strict json (comments, empty) or already in order is left as is, rewriting it would lose the comments or the layout
 * @param file the file path, relative to the project folder
 * @param before the text before the fixes, empty when the file is new
 * @param after the text after the fixes
 * @returns the sorted text, with the indentation and the final newline of the original
 */
export function sortJson(file: string, before: string, after: string) {
  if (!file.endsWith('.json')) return after
  try {
    if (before !== '' && !isPackageJson(file) && !isSorted(file, before)) return after
    if (isSorted(file, after)) return after
    const { sorted } = sortedOf(file, after)
    const indent = /^(?<indent>[\t ]+)\S/mu.exec(after)?.groups?.indent ?? '  '
    const eol = after.includes('\r\n') ? '\r\n' : '\n'
    const out = JSON.stringify(sorted, undefined, indent).replaceAll('\n', eol)
    return after.endsWith('\n') ? `${out}${eol}` : out
  } catch {
    return after
  }
}
