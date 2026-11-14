import { defineRule } from '../../engine/define-rule.ts'
import type { FileReader } from '../../engine/io.ts'
import { scriptsMatching } from '../../engine/package-json.ts'

/** The vite and tsdown config files, the first one that exists gets the plugin */
const buildConfigFiles = ['vite.config.mts', 'vite.config.ts', 'vite.config.mjs', 'vite.config.js', 'tsdown.config.mts', 'tsdown.config.ts', 'tsdown.config.mjs', 'tsdown.config.js']

const pluginImport = "import { uniqueMark } from 'shuutils/plugins'"

/**
 * Find where the array that follows `plugins:` ends
 * @param text the text of the config file
 * @param start the index of the opening bracket
 * @returns the index of the matching closing bracket, -1 when there is none
 */
function findClosingBracket(text: string, start: number) {
  let depth = 0
  for (let index = start; index < text.length; index += 1) {
    const char = text.charAt(index)
    if (char === '[') depth += 1
    if (char === ']') depth -= 1
    if (depth === 0) return index
  }
  return -1
}

/**
 * Add the uniqueMark call as the last item of the plugins array, keeping its layout: one item per line stays that way, a trailing comma stays
 * @param inner the text between the brackets of the plugins array
 * @returns the new text between the brackets
 */
function appendPlugin(inner: string) {
  const items = inner.trimEnd()
  if (items.trim() === '') return 'uniqueMark()'
  const hasComma = items.endsWith(',')
  const kept = hasComma ? items.slice(0, -1) : items
  const indent = /\n(?<indent>[\t ]*)\S[^\n]*$/u.exec(kept)?.groups?.indent
  const separator = indent === undefined ? ' ' : `\n${indent}`
  return `${kept},${separator}uniqueMark()${hasComma ? ',' : ''}${inner.slice(items.length)}`
}

/**
 * Add the uniqueMark plugin of shuutils to the text of a vite or tsdown config: its import after the last one, and its call at the end of the plugins, created when the config has none
 * @param text the text of the config file
 * @returns the new text, the same when the config has no `defineConfig({` nor `plugins: [` to put the plugin in
 */
function addUniqueMark(text: string) {
  const open = /plugins:\s*\[/u.exec(text)
  const start = open === null ? -1 : open.index + open[0].length - 1
  const end = start === -1 ? -1 : findClosingBracket(text, start)
  const withPlugin = end === -1 ? text.replace(/defineConfig\(\{/u, 'defineConfig({\n  plugins: [uniqueMark()],') : `${text.slice(0, start + 1)}${appendPlugin(text.slice(start + 1, end))}${text.slice(end)}`
  if (withPlugin === text) return text
  const lastImport = [...withPlugin.matchAll(/^import\s.+$/gmu)].at(-1)
  if (lastImport === undefined) return `${pluginImport}\n${withPlugin}`
  const importEnd = lastImport.index + lastImport[0].length
  return `${withPlugin.slice(0, importEnd)}\n${pluginImport}${withPlugin.slice(importEnd)}`
}

/**
 * Read the vite and tsdown configs of the project
 * @param files the reader of the project files
 * @returns the texts in the order of the config files, undefined for a missing one
 */
function readConfigs(files: FileReader) {
  return Promise.all(buildConfigFiles.map(file => files.readText(file)))
}

/**
 * Tell if one of the configs uses the unique-mark plugin
 * @param texts the texts of the configs
 * @returns true when one does
 */
function isMarked(texts: readonly (string | undefined)[]) {
  return texts.some(text => text?.includes('unique-mark') === true || text?.includes('uniqueMark') === true)
}

export const uniqueMarkPlugin = defineRule({
  appliesTo: ({ flags, pkg }) => flags.isUsingShuutils === true && pkg?.scripts?.build !== undefined,
  async check({ files, report }) {
    const texts = await readConfigs(files)
    if (isMarked(texts)) return
    const config = buildConfigFiles.find((_file, index) => texts[index] !== undefined)
    if (config === undefined) report({ messageId: 'missing' })
    else report({ fix: fixer => fixer.text(config, addUniqueMark), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'unique-mark-plugin', messages: { missing: 'no uniqueMark plugin in the vite or tsdown config, like plugins: [uniqueMark()] from shuutils/plugins' }, severity: 'warning' },
})

export const uniqueMarkNoBinary = defineRule({
  appliesTo: async ({ files }) => isMarked(await readConfigs(files)),
  check({ pkg, report }) {
    for (const [name] of scriptsMatching(pkg, /\bunique-mark\b/u)) report({ data: { name }, messageId: 'found' })
  },
  meta: { id: 'unique-mark-no-binary', messages: { found: 'script "{{name}}" runs the unique-mark binary, the plugin of the vite or tsdown config already marks the build, remove it' }, severity: 'warning' },
})
