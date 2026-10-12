/**
 * Rule factories for the checks on any project file: it must exist, must not exist, must or must not contain a pattern, or must declare a JSON schema.
 * A rule about a file's content is skipped when the file is absent, the rule that requires the file reports that.
 * @module
 */
import { invariant } from 'es-toolkit'
import { parse } from 'jsonc-parser'
import type { Context } from './context.ts'
import { defineRule, type Severity } from './define-rule.ts'
import type { FileReader } from './io.ts'

/** The files a rule looks at, fixed or depending on the project, like `eslint.config.js` for an ESM project */
type Candidates = readonly string[] | ((context: Readonly<Context>) => readonly string[])

/** The options shared by the file rule factories */
interface FileRuleOptions {
  /** The files to look at, the first one that exists is used */
  files: Candidates
  /** The check id from docs/checks.md */
  id: string
  /** The message, `{{file}}` is the file name */
  message: string
  /** The severity of the rule */
  severity: Severity
  /** Only check when it returns true, the rule always applies when left out */
  when?: (context: Readonly<Context>) => boolean
}

/** A file and its text */
interface FoundFile {
  /** The file path, relative to the project folder */
  file: string
  /** The file text */
  text: string
}

/**
 * Resolve the candidate files of a rule for a project
 * @param files the candidates, fixed or depending on the project
 * @param context the project context
 * @returns the candidate paths
 */
function candidatesOf(files: Candidates, context: Readonly<Context>) {
  return typeof files === 'function' ? files(context) : files
}

/**
 * Read the first candidate that exists
 * @param reader the reader of the project files
 * @param candidates the candidate paths, in order of preference
 * @returns the file and its text, undefined when none exists
 */
async function firstExisting(reader: Readonly<FileReader>, candidates: readonly string[]): Promise<FoundFile | undefined> {
  const texts = await Promise.all(candidates.map(file => reader.readText(file)))
  const index = texts.findIndex(text => text !== undefined)
  return index === -1 ? undefined : { file: String(candidates[index]), text: String(texts[index]) }
}

/**
 * Tell if a content rule applies: its condition holds and one of its files exists
 * @param context the project context
 * @param options the rule options
 * @param options.files the candidate files
 * @param options.when the rule condition
 * @returns true when the rule applies
 */
async function contentApplies(context: Readonly<Context>, { files, when = () => true }: Readonly<FileRuleOptions>) {
  return when(context) && (await firstExisting(context.files, candidatesOf(files, context))) !== undefined
}

/**
 * Read the file a content rule checks, `contentApplies` guarantees it exists
 * @param context the project context
 * @param files the candidates
 * @returns the file and its text
 */
async function readChecked(context: Readonly<Context>, files: Candidates): Promise<FoundFile> {
  const found = await firstExisting(context.files, candidatesOf(files, context))
  invariant(found !== undefined, 'appliesTo guarantees the file exists')
  return found
}

/**
 * A rule that requires one of the files to exist
 * @param options the options
 * @param options.files the candidates, any of them is enough
 * @param options.id the check id
 * @param options.message the message when none exists, `{{file}}` is the first candidate
 * @param options.severity the severity
 * @param options.when only check when it returns true
 * @returns the rule
 * @example requireFile({ files: ['.nvmrc'], id: 'nvmrc-exists', message: 'no {{file}} file', severity: 'error' })
 */
export function requireFile({ files, id, message, severity, when = () => true }: Readonly<FileRuleOptions>) {
  return defineRule({
    appliesTo: when,
    async check(context) {
      const candidates = candidatesOf(files, context)
      if ((await firstExisting(context.files, candidates)) === undefined) context.report({ data: { file: String(candidates[0]) }, messageId: 'missing' })
    },
    meta: { id, messages: { missing: message }, severity },
  })
}

/**
 * A rule that reports each of the files that exists
 * @param options the options
 * @param options.files the files that should not exist
 * @param options.id the check id
 * @param options.message the message for each file found, `{{file}}` is its name
 * @param options.severity the severity
 * @param options.when only check when it returns true
 * @returns the rule
 * @example forbidFile({ files: ['.eslintrc.json'], id: 'eslint-no-deprecated-config', message: '{{file}} is deprecated', severity: 'warning' })
 */
export function forbidFile({ files, id, message, severity, when = () => true }: Readonly<FileRuleOptions>) {
  return defineRule({
    appliesTo: when,
    async check(context) {
      const candidates = candidatesOf(files, context)
      const texts = await Promise.all(candidates.map(file => context.files.readText(file)))
      for (const file of candidates.filter((_file, index) => texts[index] !== undefined)) context.report({ data: { file }, messageId: 'found' })
    },
    meta: { id, messages: { found: message }, severity },
  })
}

/**
 * A rule that requires the first existing file to match a pattern, fixable when a transform is given. Skipped when no file exists
 * @param options the options
 * @param options.fix turn the file text into a fixed one
 * @param options.files the candidates, the first one that exists is checked
 * @param options.id the check id
 * @param options.message the message when it does not match, `{{file}}` is the checked file
 * @param options.pattern the pattern, without the `g` flag
 * @param options.severity the severity
 * @param options.when only check when it returns true
 * @returns the rule
 * @example requireInFile({ files: ['.gitignore'], id: 'gitignore-node-modules', message: '{{file}} does not list node_modules', pattern: /node_modules/u, severity: 'warning' })
 */
export function requireInFile(options: Readonly<FileRuleOptions & { fix?: (text: string) => string; pattern: RegExp }>) {
  const { fix, files, id, message, pattern, severity } = options
  return defineRule({
    appliesTo: context => contentApplies(context, options),
    async check(context) {
      const { file, text } = await readChecked(context, files)
      if (pattern.test(text)) return
      context.report(fix === undefined ? { data: { file }, messageId: 'missing' } : { data: { file }, fix: fixer => fixer.text(file, fix), messageId: 'missing' })
    },
    meta: { fixable: fix !== undefined, id, messages: { missing: message }, severity },
  })
}

/**
 * A rule that forbids a pattern in the first existing file. Skipped when no file exists
 * @param options the options
 * @param options.files the candidates, the first one that exists is checked
 * @param options.id the check id
 * @param options.message the message when it matches, `{{file}}` is the checked file
 * @param options.pattern the pattern, without the `g` flag
 * @param options.severity the severity
 * @param options.when only check when it returns true
 * @returns the rule
 * @example forbidInFile({ files: ['.gitignore'], id: 'gitignore-keeps-pnpm-lock', message: '{{file}} excludes pnpm-lock.yaml', pattern: /pnpm-lock\.yaml/u, severity: 'warning' })
 */
export function forbidInFile(options: Readonly<FileRuleOptions & { pattern: RegExp }>) {
  const { files, id, message, pattern, severity } = options
  return defineRule({
    appliesTo: context => contentApplies(context, options),
    async check(context) {
      const { file, text } = await readChecked(context, files)
      if (pattern.test(text)) context.report({ data: { file }, messageId: 'found' })
    },
    meta: { id, messages: { found: message }, severity },
  })
}

/**
 * A rule that requires a JSON file to declare a `$schema`, fixable: the schema is set first in the file. Skipped when no file exists
 * @param options the options
 * @param options.files the candidates, the first one that exists is checked
 * @param options.id the check id
 * @param options.schema the expected schema url
 * @param options.severity the severity
 * @param options.when only check when it returns true
 * @returns the rule
 * @example requireJsonSchema({ files: ['renovate.json'], id: 'renovate-schema', schema: 'https://docs.renovatebot.com/renovate-schema.json', severity: 'warning' })
 */
export function requireJsonSchema(options: Readonly<Omit<FileRuleOptions, 'message'> & { schema: string }>) {
  const { files, id, schema, severity } = options
  return defineRule({
    appliesTo: context => contentApplies(context, { ...options, message: '' }),
    async check(context) {
      const { file, text } = await readChecked(context, files)
      const declared = (parse(text) as { $schema?: unknown } | undefined)?.$schema
      if (declared !== schema) context.report({ data: { file, schema }, fix: fixer => fixer.json(file).set(['$schema'], schema, { isFirst: true }), messageId: 'missing' })
    },
    meta: { fixable: true, id, messages: { missing: '{{file}} does not declare the "$schema": "{{schema}}"' }, severity },
  })
}
