/**
 * The fixer handed to `report({ fix })`. It never writes: it builds edits that the runner chains, previews and applies after confirmation.
 * @module
 */
import { generateCode, parseModule } from 'magicast'
import { getDefaultExportOptions } from 'magicast/helpers'
import { applyEdits, findNodeAtLocation, getNodeValue, type JSONPath, modify, parseTree } from 'jsonc-parser'

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
 * Build an edit that changes one json value, keeping the formatting, the key order and the comments of the file. An empty text becomes a new json object
 * @param update the update
 * @param update.file the file path, relative to the project folder
 * @param update.isFirst insert the key first in its object when it does not exist yet
 * @param update.path the path of the value, like `['scripts', 'build']`
 * @param update.transform get the current value and return the new one, undefined removes the key
 * @returns the edit
 */
function updateJson({ file, isFirst = false, path, transform }: Readonly<JsonUpdate>): Edit {
  return {
    apply(text) {
      const node = findNodeAtLocation(parseTree(text) ?? { length: 0, offset: 0, type: 'null' }, path)
      const current: unknown = node === undefined ? undefined : getNodeValue(node)
      const edits = modify(text, path, transform(current), { formattingOptions: detectFormatting(text), ...(isFirst && { getInsertionIndex: () => 0 }) })
      return applyEdits(text, edits)
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
   * @returns the edit
   */
  set: (path: JSONPath, value: unknown, options?: Readonly<{ isFirst?: boolean }>) => Edit
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
export type ConfigOptions = ReturnType<typeof getDefaultExportOptions>

/**
 * Change the options a JavaScript or TypeScript config file exports by default, like the object given to `defineConfig`. The text is left as is when the file does not export options in a way that can be read
 * @param text the text of the config file
 * @param update change the options
 * @returns the new text
 * @example editConfig("export default defineConfig({})", options => { options.test = { pool: 'threads' } })
 */
export function editConfig(text: string, update: (options: ConfigOptions) => void) {
  try {
    const module = parseModule(text)
    update(getDefaultExportOptions(module))
    const { code } = generateCode(module)
    return text.endsWith('\n') && !code.endsWith('\n') ? `${code}\n` : code
  } catch {
    return text
  }
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
