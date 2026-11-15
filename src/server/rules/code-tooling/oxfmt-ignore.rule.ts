import path from 'node:path'
import { parse } from 'jsonc-parser'
import type { Context } from '../../engine/context.ts'
import { defineRule } from '../../engine/define-rule.ts'
import { hasDependency } from '../../engine/package-json.ts'

const files = ['.oxfmtrc.json', '.oxfmtrc.jsonc']

/** The tracked files that are usually generated or vendored, formatting them makes noisy diffs, the key is the `ignorePatterns` entry to add */
const generatedPatterns = ['**/__snapshots__/**', '**/__generated__/**', '**/generated/**', '**/mocks/**', '**/vendor/**', '**/*.generated.*', '**/*.min.js', '**/*.min.css']

/**
 * Read the oxfmt config of the project
 * @param context the project context
 * @param context.files the project files reader
 * @returns the file and the ignore patterns it declares, undefined when there is no config
 */
async function readConfig({ files: reader }: Readonly<Context>) {
  const texts = await Promise.all(files.map(file => reader.readText(file)))
  const index = texts.findIndex(text => text !== undefined)
  if (index === -1) return undefined
  const config = (parse(String(texts[index])) ?? {}) as { ignorePatterns?: unknown }
  const patterns = Array.isArray(config.ignorePatterns) ? config.ignorePatterns.filter((pattern): pattern is string => typeof pattern === 'string') : []
  return { file: String(files[index]), patterns }
}

/**
 * Reduce a folder pattern to its bare name, so `**\/dist`, `/dist/` and `dist/**` all give `dist`
 * @param pattern a gitignore line or an ignore pattern
 * @returns the bare name
 */
function bareName(pattern: string) {
  return pattern
    .replace(/^\.?\//u, '')
    .replace(/^\*\*\//u, '')
    .replace(/\/(?:\*\*)?$/u, '')
}

/**
 * Tell if the oxfmt ignore checks apply: the project uses oxfmt
 * @param context the project context
 * @returns true when they do
 */
function applies(context: Readonly<Context>) {
  return hasDependency(context.pkg, 'oxfmt')
}

export const oxfmtIgnoreRedundant = defineRule({
  appliesTo: applies,
  async check(context) {
    const config = await readConfig(context)
    const gitignore = await context.files.readText('.gitignore')
    if (config === undefined || gitignore === undefined) return
    const ignored = new Set(
      gitignore
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '' && !line.startsWith('#') && !line.startsWith('!'))
        .map(line => bareName(line)),
    )
    for (const pattern of config.patterns.filter(item => ignored.has(bareName(item))))
      context.report({ data: { file: config.file, pattern }, fix: fixer => fixer.json(config.file).update(['ignorePatterns'], (current: unknown) => (current as string[]).filter(item => item !== pattern)), messageId: 'redundant' })
  },
  meta: { fixable: true, id: 'oxfmt-ignore-redundant', messages: { redundant: '{{file}} ignores "{{pattern}}" but .gitignore already does, and oxfmt follows .gitignore' }, severity: 'warning' },
})

export const oxfmtIgnoreGenerated = defineRule({
  appliesTo: applies,
  async check(context) {
    const config = await readConfig(context)
    if (config === undefined) return
    const visible = await context.files.search(/^/u)
    const tracked = visible.filter(file => !config.patterns.some(pattern => path.posix.matchesGlob(file, pattern)))
    for (const pattern of generatedPatterns) {
      const count = tracked.filter(file => path.posix.matchesGlob(file, pattern)).length
      if (count > 0) context.report({ data: { count, file: config.file, pattern }, fix: fixer => fixer.json(config.file).update(['ignorePatterns'], (current: unknown) => [...(Array.isArray(current) ? (current as unknown[]) : []), pattern]), messageId: 'generated' })
    }
  },
  meta: { fixable: true, id: 'oxfmt-ignore-generated', messages: { generated: '{{count}} tracked files match "{{pattern}}", they look generated: add it to the ignorePatterns of {{file}} so oxfmt leaves them alone' }, severity: 'info' },
})
