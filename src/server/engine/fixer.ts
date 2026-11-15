/**
 * The fixer handed to `report({ fix })`. It never writes: it builds edits that the runner chains, previews and applies after confirmation.
 * @module
 */

import { applyEdits, findNodeAtLocation, getNodeValue, type JSONPath, modify, type Node, parseTree } from 'jsonc-parser'
import { generateCode, parseModule } from 'magicast'
import { Result } from 'shuutils'

/** A change to one file, applied on the latest text of that file so the edits of several rules can be chained */
export interface Edit {
  /** Get the text of the file, possibly already changed by previous edits, and return the new text */
  apply: (text: string) => string
  /** The file path, relative to the project folder */
  file: string
}

/** The description of one json change, see `updateJson` */
interface JsonUpdate {
  /** The file path, relative to the project folder */
  file: string
  /** Insert the key first in its object when it does not exist yet, like `$schema` */
  isFirst?: boolean
  /** Sort the root keys alphabetically once the value is set */
  isSorted?: boolean
  /** The path of the value, like `['scripts', 'build']` */
  path: JSONPath
  /** Get the current value (undefined when absent) and return the new one (undefined removes the key) */
  transform: (current: unknown) => unknown
}

/**
 * Detect the indentation and line endings of a json text, two spaces and lf when nothing tells
 * @param text the json text
 * @returns the jsonc-parser formatting options
 */
function detectFormatting(text: string) {
  const indent = /^(?<indent>[\t ]+)\S/mu.exec(text)?.groups?.indent ?? '  '
  const isTab = indent.startsWith('\t')
  return { eol: text.includes('\r\n') ? '\r\n' : '\n', insertSpaces: !isTab, tabSize: isTab ? 1 : indent.length }
}

/**
 * Find where a new key goes in an object whose keys are sorted, so the file stays sorted. Appends when the keys are not sorted
 * @param key the new key
 * @returns the insertion index getter for jsonc-parser
 */
function sortedInsertionIndex(key: string) {
  return (keys: string[]) => {
    const isSorted = keys.every((name, index) => index === 0 || (keys[index - 1] as string) <= name)
    const index = isSorted ? keys.findIndex(name => name > key) : -1
    return index === -1 ? keys.length : index
  }
}

/**
 * Sort the root keys of a json object alphabetically, each key keeping its own text. Comments between the keys are dropped
 * @param text the json text
 * @returns the text with sorted root keys, the root is always an object here, as a key was just set
 */
function sortRootKeys(text: string) {
  const properties = (parseTree(text) as Node).children as Node[]
  const [first, last] = [properties[0] as Node, properties.at(-1) as Node]
  const before = text.slice(0, first.offset)
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const entries = properties.map(property => ({ key: String((property.children as Node[])[0]?.value), text: text.slice(property.offset, property.offset + property.length) }))
  const sorted = entries.toSorted((left, right) => (left.key < right.key ? -1 : Number(left.key > right.key)))
  return before + sorted.map(entry => entry.text).join(`,${eol}${before.slice(before.search(/[\t ]*$/u))}`) + text.slice(last.offset + last.length)
}

/**
 * Get the key of a property node of a json object
 * @param property the property node, a key and a value
 * @returns the key
 */
function keyOf(property: Readonly<Node>) {
  return String((property.children as [Node])[0].value)
}

/**
 * Put back the original text of the sibling keys of a changed key. The jsonc-parser formatter reformats the whole line next to an insertion, so an inline `["a"]` before a new key would be expanded on several lines, and a formatter would then complain
 * @param before the json text before the change
 * @param after the json text after the change
 * @param path the path of the changed value
 * @returns the text after the change, with the siblings of the changed key as they were
 */
function keepSiblings(before: string, after: string, path: JSONPath) {
  const parentPath = path.slice(0, -1)
  const parent = findNodeAtLocation(parseTree(before) ?? { length: 0, offset: 0, type: 'null' }, parentPath)
  if (parent?.type !== 'object') return after
  const tree = parseTree(after) as Node
  const siblings = (parent.children as Node[])
    .filter(property => keyOf(property) !== path.at(-1))
    .map(property => ({ moved: (findNodeAtLocation(tree, [...parentPath, keyOf(property)]) as Node).parent as Node, original: before.slice(property.offset, property.offset + property.length) }))
    .toSorted((first, second) => second.moved.offset - first.moved.offset)
  let text = after
  for (const { moved, original } of siblings) text = `${text.slice(0, moved.offset)}${original}${text.slice(moved.offset + moved.length)}`
  return text
}

/**
 * Build an edit that changes one json value, keeping the formatting, the key order and the comments of the file. An empty text becomes a new json object
 * @param update the update
 * @param update.file the file path, relative to the project folder
 * @param update.isFirst insert the key first in its object when it does not exist yet
 * @param update.isSorted sort the root keys alphabetically once the value is set
 * @param update.path the path of the value, like `['scripts', 'build']`
 * @param update.transform get the current value and return the new one, undefined removes the key
 * @returns the edit
 */
function updateJson({ file, isFirst = false, isSorted = false, path, transform }: Readonly<JsonUpdate>): Edit {
  return {
    apply(text) {
      const node = findNodeAtLocation(parseTree(text) ?? { length: 0, offset: 0, type: 'null' }, path)
      const current: unknown = node === undefined ? undefined : getNodeValue(node)
      const getInsertionIndex = isFirst ? () => 0 : sortedInsertionIndex(String(path.at(-1)))
      const edits = modify(text, path, transform(current), { formattingOptions: detectFormatting(text), getInsertionIndex })
      const result = keepSiblings(text, applyEdits(text, edits), path)
      return isSorted ? sortRootKeys(result) : result
    },
    file,
  }
}

/** The json edit builders of one file, from `fixer.json(file)` */
interface JsonEdits {
  /**
   * Remove a key, nothing happens when it is absent
   * @param path the path of the key, like `['devDependencies', 'tslint']`
   * @returns the edit
   */
  remove: (path: JSONPath) => Edit
  /**
   * Set a value, creating the key and its parents when absent
   * @param path the path of the value
   * @param value the new value
   * @param options the options
   * @param options.isFirst insert the key first in its object when it does not exist yet
   * @param options.isSorted sort the root keys alphabetically once the value is set
   * @returns the edit
   */
  set: (path: JSONPath, value: unknown, options?: Readonly<{ isFirst?: boolean; isSorted?: boolean }>) => Edit
  /**
   * Compute the new value from the current one, read when the edit is applied so it sees the edits of previous rules
   * @param path the path of the value
   * @param transform get the current value (undefined when absent) and return the new one (undefined removes the key)
   * @returns the edit
   */
  update: (path: JSONPath, transform: JsonUpdate['transform']) => Edit
}

/**
 * The json edit builders of one file
 * @param file the file path, relative to the project folder
 * @returns the edit builders: `remove`, `set` and `update`
 * @example
 * fixer.json('package.json').set(['$schema'], 'https://json.schemastore.org/package', { isFirst: true })
 * fixer.json('package.json').update(['scripts', 'test'], current => String(current).replace('npm run', 'pnpm'))
 * fixer.json('package.json').remove(['devDependencies', 'tslint'])
 */
function json(file: string): JsonEdits {
  return {
    remove: path => updateJson({ file, path, transform: () => undefined }),
    set: (path, value, options = {}) => updateJson({ file, path, transform: () => value, ...options }),
    update: (path, transform) => updateJson({ file, path, transform }),
  }
}

/** The options object a config file exports by default, like the one given to `defineConfig`, that `editConfig` lets a rule change */
export type ConfigOptions = Record<string, Record<string, unknown> | undefined>

/** A node of the code of a config file, as magicast shows it: its type, and its arguments when it is a call */
interface ConfigNode {
  /** The arguments of a call, like the one of `defineConfig({})` */
  $args: ConfigNode[]
  /** The kind of node, `object` for `{}`, `function-call` for `defineConfig()` */
  $type: string
}

/**
 * Find the options object in what a config file exports: the object itself, the last object given to a call like `defineConfig({})`, or the one inside a nested call like `mergeConfig(viteConfig, defineConfig({}))`
 * @param node the exported node
 * @returns the options, undefined when there is no object to edit, for example for an exported variable
 */
function findOptions(node: Readonly<ConfigNode>): ConfigOptions | undefined {
  if (node.$type === 'object') return node as unknown as ConfigOptions
  if (node.$type !== 'function-call') return undefined
  for (const argument of [...node.$args].toReversed()) {
    const options = findOptions(argument)
    if (options !== undefined) return options
  }
  return undefined
}

/** A property of an object in the code of a config file: its key is a name, or a literal like `'100'` */
interface ConfigProperty {
  /** The key */
  key: { name?: string; value?: number | string }
}

/**
 * Get the keys of the properties of an object of a config file, undefined for one that has no key, like a spread
 * @param properties the properties
 * @returns the keys, in order
 */
function keysOf(properties: readonly Readonly<ConfigProperty>[]) {
  return properties.map(property => (property.key === undefined ? undefined : String(property.key.name ?? property.key.value)))
}

/**
 * Set a key of an object of a config file. A new key goes at its sorted place when the keys of the object are sorted, at the end otherwise, so a lint rule that wants sorted keys keeps passing. A key that is there keeps its place
 * @param object the object, from the options given to `editConfig`
 * @param key the key
 * @param value the value
 * @example setOption(options.test, 'globals', true)
 */
export function setOption(object: Record<string, unknown>, key: string, value: unknown) {
  const { properties } = (object as unknown as { $ast: { properties: ConfigProperty[] } }).$ast
  const keys = keysOf(properties)
  const isSorted = keys.every((name, index) => name !== undefined && (index === 0 || String(keys[index - 1]) <= name))
  object[key] = value
  const index = keys.findIndex(name => String(name) > key)
  if (isSorted && !keys.includes(key) && index !== -1) properties.splice(index, 0, properties.pop() as ConfigProperty)
}

/**
 * Tell which lines have a blank line between them in a text
 * @param lines the lines of the text
 * @returns the pairs `previous line` and `next line`, trimmed, that had a blank line in between
 */
function blankSeparated(lines: readonly string[]) {
  const pairs = new Set<string>()
  for (const [index, line] of lines.entries()) if (line.trim() === '' && index > 0 && index < lines.length - 1) pairs.add(`${String(lines[index - 1]).trim()}\n${String(lines[index + 1]).trim()}`)
  return pairs
}

/**
 * Drop the blank lines the code generator added around the properties it rewrote, and keep the ones the file had
 * @param before the text before the change
 * @param after the generated text
 * @returns the generated text without the blank lines that were not in the file
 */
function dropAddedBlankLines(before: string, after: string) {
  const kept = blankSeparated(before.split('\n'))
  const lines = after.split('\n')
  return lines.filter((line, index) => line.trim() !== '' || index === 0 || index === lines.length - 1 || kept.has(`${String(lines[index - 1]).trim()}\n${String(lines[index + 1]).trim()}`)).join('\n')
}

/**
 * Change the options a JavaScript or TypeScript config file exports by default, like the object given to `defineConfig`, or to the `defineConfig` inside a `mergeConfig`. The text is left as is when the file does not export options in a way that can be read
 * @param text the text of the config file
 * @param update change the options
 * @returns the new text
 * @example editConfig("export default defineConfig({})", options => { options.test = { pool: 'threads' } })
 */
export function editConfig(text: string, update: (options: ConfigOptions) => void) {
  const edited = Result.trySafe(() => {
    const parsed = parseModule(text)
    const options = findOptions(parsed.exports.default as ConfigNode)
    if (options === undefined) return text
    update(options)
    const { code } = generateCode(parsed, { format: { trailingComma: /,\s*\n\s*[)\]}]/u.test(text) } })
    const cleaned = dropAddedBlankLines(text, code)
    return text.endsWith('\n') && !cleaned.endsWith('\n') ? `${cleaned}\n` : cleaned
  })
  return edited.ok ? edited.value : text
}

/** The edit builders a rule gets in `report({ fix: fixer => ... })` */
export const fixer = {
  /**
   * An edit of the options a config file exports by default, see `editConfig`
   * @param file the file path, relative to the project folder
   * @param update change the options
   * @returns the edit
   * @example fixer.config('vitest.config.ts', options => { options.test = { pool: 'threads' } })
   */
  config: (file: string, update: (options: ConfigOptions) => void): Edit => ({ apply: text => editConfig(text, update), file }),
  /** Json edits that keep formatting and comments, see `json` */
  json,
  /**
   * A plain text edit, for files that are not json
   * @param file the file path, relative to the project folder
   * @param transform get the current text (empty when the file does not exist) and return the new one
   * @returns the edit
   * @example fixer.text('.nvmrc', text => text.replace('22', '24'))
   */
  text: (file: string, transform: (text: string) => string): Edit => ({ apply: transform, file }),
}

/** The type of `fixer`, as seen by rules */
export type Fixer = typeof fixer
