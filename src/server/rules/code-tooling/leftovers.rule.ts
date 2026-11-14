import type { Context } from '../../engine/context.ts'
import { defineRule } from '../../engine/define-rule.ts'
import { forbidFile, forbidInFile } from '../../engine/file-rules.ts'
import { removeIgnoreLines } from '../../engine/gitignore.ts'
import { hasDependency } from '../../engine/package-json.ts'

/** A tool that was dropped for oxlint and oxfmt, and what it leaves behind */
interface Tool {
  /** The config files */
  configs: string[]
  /** The VS Code extension id */
  extension: string
  /** The name of the tool, in the ids and the messages */
  name: string
  /** The pattern of its comments, `eslint-disable` or `biome-ignore`, without the comment mark */
  directive: string
  /** Tell if the project still uses the tool */
  isUsed: (context: Readonly<Context>) => boolean
  /** The pattern of a script that runs the tool */
  script: RegExp
}

const eslintTool: Tool = {
  configs: ['.eslintrc', '.eslintrc.json', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.yml', '.eslintignore', 'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts', 'eslint.config.mts'],
  directive: String.raw`eslint-(?:disable|enable)`,
  extension: 'dbaeumer.vscode-eslint',
  isUsed: ({ pkg }) => hasDependency(pkg, 'eslint'),
  name: 'eslint',
  script: /(?:^|&&|\|\||;|\|)\s*(?:(?:pnpm|npm|bun)x?\s+(?:exec\s+|run\s+)?|npx\s+|bunx\s+)?eslint(?![\w:-])/u,
}

const biomeTool: Tool = {
  configs: ['biome.json', 'biome.jsonc'],
  directive: 'biome-ignore',
  extension: 'biomejs.biome',
  isUsed: ({ pkg }) => hasDependency(pkg, '@biomejs/biome'),
  name: 'biome',
  script: /(?:^|&&|\|\||;|\|)\s*(?:(?:pnpm|npm|bun)x?\s+(?:exec\s+|run\s+)?|npx\s+|bunx\s+)?biome(?![\w:-])/u,
}

/** The source files that can hold a directive comment */
const sourceFile = /\.(?:[cm]?[jt]sx?|vue|svelte|astro)$/u

/** Generated files and vendored ones are not edited by hand, their header comment is not a leftover */
const generatedFile = /\.d\.ts$|(?:^|\/)(?:_generated|generated|vendor)\/|\.generated\./u

/**
 * Build the pattern of a directive comment, with no quote before it on its line so a string that mentions it is not matched
 * @param directive the directive, like `biome-ignore`
 * @param flags the flags of the pattern
 * @returns the pattern
 */
function commentPattern(directive: string, flags: string) {
  return new RegExp(String.raw`^[^'"\x60\n]*(?:\/\/|\/\*|<!--)\s*${directive}`, flags)
}

/**
 * Tell if the project no longer uses a tool
 * @param tool the tool
 * @returns a function for the `appliesTo` of a rule
 */
function isGone(tool: Readonly<Tool>) {
  return (context: Readonly<Context>) => !tool.isUsed(context)
}

/**
 * Build the rule about the VS Code extension of a tool
 * @param tool the tool
 * @param tool.extension the extension id
 * @param tool.isUsed tells if the project still uses the tool
 * @param tool.name the name of the tool
 * @returns the rule
 */
function extensionRule({ extension, isUsed, name }: Readonly<Tool>) {
  return defineRule({
    appliesTo: context => !isUsed(context),
    async check({ files, report }) {
      const text = await files.readText('.vscode/extensions.json')
      if (text?.includes(extension) !== true) return
      report({ data: { file: '.vscode/extensions.json' }, fix: fixer => fixer.json('.vscode/extensions.json').update(['recommendations'], (current: unknown) => (Array.isArray(current) ? current.filter(item => item !== extension) : current)), messageId: 'found' })
    },
    meta: { fixable: true, id: `${name}-leftover-extension`, messages: { found: `{{file}} still recommends the ${name} extension (${extension}), the project no longer uses ${name}` }, severity: 'info' },
  })
}

/**
 * Build the rule about the directive comments of a tool
 * @param tool the tool
 * @param tool.directive the pattern of its directive comments
 * @param tool.isUsed tells if the project still uses the tool
 * @param tool.name the name of the tool
 * @returns the rule, fixable for eslint in a project that uses oxlint
 */
function commentRule({ directive, isUsed, name }: Readonly<Tool>) {
  return defineRule({
    appliesTo: context => !isUsed(context),
    async check({ files, pkg, report }) {
      const found = await files.search(commentPattern(directive, 'mu'))
      const canRename = name === 'eslint' && hasDependency(pkg, 'oxlint')
      for (const file of found.filter(item => sourceFile.test(item) && !generatedFile.test(item))) {
        const rename = (text: string) => text.replaceAll(commentPattern(directive, 'gmu'), line => line.replace('eslint-', 'oxlint-'))
        report({ data: { file }, ...(canRename && { fix: fixer => fixer.text(file, rename) }), messageId: 'found' })
      }
    },
    meta: { fixable: name === 'eslint', id: `${name}-leftover-comment`, messages: { found: `{{file}} has a ${name} directive comment, the project no longer uses ${name}. oxlint reads eslint-disable comments but wants oxlint-disable ones` }, severity: 'info' },
  })
}

/**
 * Build the rule about the scripts that run a tool
 * @param tool the tool
 * @param tool.isUsed tells if the project still uses the tool
 * @param tool.name the name of the tool
 * @param tool.script the pattern of a script that runs the tool
 * @returns the rule
 */
function scriptRule({ isUsed, name, script }: Readonly<Tool>) {
  return defineRule({
    appliesTo: context => !isUsed(context),
    check({ pkg, report }) {
      for (const [task, command] of Object.entries(pkg?.scripts ?? {})) if (script.test(command)) report({ data: { script: task }, messageId: 'found' })
    },
    meta: { id: `${name}-leftover-script`, messages: { found: `the script "{{script}}" runs ${name} but the project no longer uses ${name}` }, severity: 'warning' },
  })
}

/**
 * Build the rules for the leftovers of a tool, they only apply once the project no longer uses it
 * @param tool the tool
 * @returns the rules
 */
function leftoverRules(tool: Readonly<Tool>) {
  return [forbidFile({ files: tool.configs, id: `${tool.name}-leftover-config`, message: `{{file}} is a ${tool.name} config but the project no longer uses ${tool.name}, remove it`, severity: 'warning', when: isGone(tool) }), extensionRule(tool), commentRule(tool), scriptRule(tool)]
}

/** The gitignore line of the eslint cache */
const eslintCacheLine = /^\s*\/?\.eslintcache\s*$/u

export const leftoverChecks = [
  ...leftoverRules(eslintTool),
  ...leftoverRules(biomeTool),
  forbidInFile({
    files: ['.gitignore'],
    fix: text => removeIgnoreLines(text, eslintCacheLine),
    id: 'eslint-leftover-gitignore',
    message: '{{file}} ignores .eslintcache but the project no longer uses eslint, remove the line',
    pattern: new RegExp(eslintCacheLine.source, 'mu'),
    severity: 'info',
    when: context => !eslintTool.isUsed(context),
  }),
]
