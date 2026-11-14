/**
 * The agreed shape of the package.json tasks, see docs/scripts-turbo.md: which tasks every project has, the command behind each, and how a task ends.
 * @module
 */
import { escapeRegExp } from 'es-toolkit'
import type { Context } from '../../engine/context.ts'
import { hasDependency, type PackageJson } from '../../engine/package-json.ts'

/** A task split into the command it runs and the echo that ends it */
export interface ParsedTask {
  /** What the task runs, before the first ` && echo ` */
  command: string
  /** The hint after `||`, like `Please run pnpm run lint:format:fix to format the code`, undefined when there is none */
  hint: string | undefined
}

/** The tasks that end with `&& echo <task> completed successfully`, the others keep running (watch, ui, dev) or only start something */
export const echoTasks: ReadonlySet<string> = new Set([
  'build',
  'build:tsc',
  'build:tsdown',
  'build:vite',
  'check',
  'lint',
  'lint:format',
  'lint:format:fix',
  'lint:install',
  'lint:issues',
  'lint:issues:fix',
  'lint:knip',
  'lint:repo',
  'lint:types',
  'test',
  'test:e2e',
  'test:unit',
  'test:update',
  'up:deps',
])

/** The task that fixes what a check task found, by check task */
const fixTasks: Readonly<Record<string, string>> = { 'lint:format': 'lint:format:fix', 'lint:issues': 'lint:issues:fix' }

/** What the failure hint says after `Please run pnpm run <fix task>`, by check task */
const hintSentences: Readonly<Record<string, string>> = { 'lint:format': 'to format the code', 'lint:issues': 'to fix the lint issues' }

/** The lint tasks run by `lint`, in the order of the `turbo run` command */
export const lintTasks = ['lint:install', 'lint:types', 'lint:knip', 'lint:format', 'lint:issues', 'lint:repo']

/** The tasks run by `check` on top of the lint ones, when the project has them */
export const checkTasks = [...lintTasks, 'test:unit', 'test:e2e']

/** The command of the tasks that always run the same thing, a list when several are accepted, the first one being the one the fix writes */
const acceptedCommands: Readonly<Record<string, readonly string[]>> = {
  'lint:format': ['oxfmt --check'],
  'lint:format:fix': ['oxfmt --write'],
  'lint:install': ['pnpm install'],
  'lint:issues': ['oxlint --type-aware --deny-warnings --report-unused-disable-directives'],
  'lint:issues:fix': ['oxlint --fix --fix-suggestions --fix-dangerously --type-aware --deny-warnings --report-unused-disable-directives'],
  'lint:knip': ['knip'],
  'lint:repo': ['repo-check'],
  'test:e2e': ['playwright test'],
  'test:ui': ['vitest --ui'],
  'test:unit': ['vitest run --coverage'],
  'test:update': ['vitest run --update'],
  'test:watch': ['vitest', 'vitest --coverage'],
  'up:deps': ['pnpm update --recursive --latest'],
}

/** The repo that runs its own sources instead of the repo-check binary, so its lint:repo is its own business */
const selfId = 'repo-checker'

/** The `lint:types` part that checks the Convex backend, accepted after the root tsconfig files */
export const convexTypes = ' && tsc -p convex/tsconfig.json'

/**
 * Split a task into its command and its failure hint
 * @param script the script text
 * @returns the command, and the hint when there is one
 * @example parseTask('oxfmt --check && echo lint:format completed successfully') // { command: 'oxfmt --check', hint: undefined }
 */
export function parseTask(script: string): ParsedTask {
  const [command = '', ...rest] = script.split(' && echo ')
  const hint = / \|\| \(echo (?<hint>.*) && exit 1\)$/u.exec(rest.join(' && echo '))?.groups?.hint
  return { command, hint }
}

/**
 * Write a task the agreed way: the command, then the echo, then the hint that points to the fix task when there is one
 * @param task the task name
 * @param command what the task runs
 * @param hint the hint the script already has, kept when it points to the fix task
 * @returns the script text
 * @example taskScript('lint:format', 'oxfmt --check') // 'oxfmt --check && echo lint:format completed successfully || (echo Please run pnpm run lint:format:fix to format the code && exit 1)'
 */
export function taskScript(task: string, command: string, hint?: string) {
  if (!echoTasks.has(task)) return command
  const fix = fixTasks[task]
  const wanted = fix === undefined || hint?.includes(`pnpm run ${fix}`) === true ? hint : `Please run pnpm run ${fix} ${hintSentences[task]}`
  return `${command} && echo ${task} completed successfully${wanted === undefined ? '' : ` || (echo ${wanted} && exit 1)`}`
}

/**
 * Rewrite a script the agreed way, keeping its command and its hint
 * @param task the task name
 * @param script the script text
 * @returns the script text, the same when it already follows the shape
 * @example endTask('lint:types', 'tsc -p tsconfig.app.json') // 'tsc -p tsconfig.app.json && echo lint:types completed successfully'
 */
export function endTask(task: string, script: string) {
  const { command, hint } = parseTask(script)
  return taskScript(task, command, hint)
}

/**
 * List the tsconfig files `lint:types` must check: every `tsconfig.<name>.json` of the root, or `tsconfig.json` when there is no other
 * @param context the project context
 * @param context.files the project files reader
 * @returns the file names, sorted, empty when the project has no tsconfig
 */
async function tsconfigFiles({ files }: Readonly<Context>) {
  const all = await files.search(/\S/u)
  const variants = all.filter(file => /^tsconfig\.[\w-]+\.json$/u.test(file))
  if (variants.length > 0) return variants
  return all.includes('tsconfig.json') ? ['tsconfig.json'] : []
}

/**
 * Get the commands a task may run
 * @param context the project context
 * @param task the task name
 * @returns the accepted commands, the first one is the one to write, empty when there is no opinion on this task
 * @example await taskCommands(context, 'up:deps') // ['pnpm update --recursive --latest']
 */
export async function taskCommands(context: Readonly<Context>, task: string): Promise<readonly string[]> {
  if (task === 'lint:repo' && context.flags.repoId === selfId) return []
  if (task === 'lint:types') {
    const names = await tsconfigFiles(context)
    return names.length === 0 ? [] : [names.map(name => `tsc -p ${name}`).join(' && ')]
  }
  if (task === 'test') return [hasDependency(context.pkg, '@playwright/test') ? 'turbo run test:unit test:e2e' : 'turbo run test:unit']
  return acceptedCommands[task] ?? []
}

/** The tasks of a Vite project */
const viteTasks = ['build', 'dev', 'preview']

/** The tasks every project has, `check` has its own check */
const coreTasks = ['lint', 'lint:format', 'lint:format:fix', 'lint:install', 'lint:issues', 'lint:issues:fix', 'lint:knip', 'lint:repo', 'lint:types', 'test', 'test:unit', 'test:update', 'test:watch', 'up:deps']

/**
 * List the tasks a project must have: the core ones, plus the ones its tools bring. The Vite tasks are for a web app: Vite and an index.html
 * @param context the project context
 * @param context.files the project files reader
 * @param context.flags the project flags
 * @param context.pkg the package.json
 * @returns the task names
 * @example await requiredTasks(context) // the core tasks, test:ui with Vitest, test:e2e with Playwright
 */
export async function requiredTasks({ files, flags, pkg }: Readonly<Context>) {
  const isWebApp = hasDependency(pkg, 'vite') && (await files.readText('index.html')) !== undefined
  return [...coreTasks.filter(task => task !== 'lint:repo' || flags.repoId !== selfId), ...(hasDependency(pkg, 'vitest') ? ['test:ui'] : []), ...(hasDependency(pkg, '@playwright/test') ? ['test:e2e'] : []), ...(isWebApp ? viteTasks : [])]
}

/** The tools the agreed lint tasks already run, with the tasks to use instead */
const duplicates: readonly (readonly [RegExp, string])[] = [
  [/\btsc\b[^&|]*--noEmit/u, 'lint:types'],
  [/\boxlint\b/u, 'lint:issues and lint:issues:fix'],
  [/\boxfmt\b/u, 'lint:format and lint:format:fix'],
]

/** The names that are never a duplicate: the agreed tasks, and the build, test and version hooks that may call a tool on purpose */
const keptNames = /^(?:build|check$|dev$|post|pre|test)/u

/**
 * Tell if a script runs a tool that an agreed lint task already runs, so the script is a leftover
 * @param name the script name
 * @param script the script text
 * @returns the agreed tasks to use instead, undefined when it is not a leftover
 * @example duplicateOf('lint:tsc', 'tsc --noEmit && echo lint:tsc success') // 'lint:types'
 */
export function duplicateOf(name: string, script: string) {
  if (coreTasks.includes(name) || keptNames.test(name)) return undefined
  const { command } = parseTask(script)
  return duplicates.find(([pattern]) => pattern.test(command))?.[1]
}

/**
 * Remove the calls to a deleted script from another script: the `pnpm <name>` steps, and the name in a `turbo run`
 * @param script the script text
 * @param name the deleted script name
 * @returns the script text without the calls
 * @example dropReferences('pnpm lint:tsc && pnpm lint:format', 'lint:tsc') // 'pnpm lint:format'
 */
export function dropReferences(script: string, name: string) {
  const call = new RegExp(`^(?:pnpm|pnpm run|npm run|bun run) ${escapeRegExp(name)}$`, 'u')
  return script
    .split(' && ')
    .filter(step => !call.test(step))
    .map(step =>
      step.startsWith('turbo run ')
        ? step
            .split(' ')
            .filter(argument => argument !== name)
            .join(' ')
        : step,
    )
    .join(' && ')
}

/**
 * List the tasks a script runs: the tasks of its `turbo run` and the `pnpm <task>` steps
 * @param command the script command
 * @returns the task names
 * @example stepNames('pnpm lint:tsc && turbo run lint:knip lint:format') // ['lint:tsc', 'lint:knip', 'lint:format']
 */
export function stepNames(command: string) {
  return command.split(' && ').flatMap(step => {
    if (step.startsWith('turbo run '))
      return step
        .slice('turbo run '.length)
        .split(' ')
        .filter(argument => /^[a-z][\w:-]*$/u.test(argument))
    const name = /^(?:pnpm|pnpm run|npm run|bun run) (?<name>[\w:-]+)$/u.exec(step)?.groups?.name
    return name === undefined ? [] : [name]
  })
}

/** The lint tasks of the agreed shape, the others are the project's own */
const agreedLintTasks = new Set([...lintTasks, 'lint:format:fix', 'lint:issues:fix'])

/**
 * List the project's own lint tasks that `check` runs, like `lint:sources`: a created `lint` script must run them too
 * @param scripts the scripts
 * @returns the task names, only the scripts that exist and are not leftovers
 * @example customLintTasks({ check: 'turbo run lint:types lint:sources', 'lint:sources': 'bun lint.ts' }) // ['lint:sources']
 */
function customLintTasks(scripts: Readonly<Record<string, string>>) {
  return [...new Set(stepNames(parseTask(scripts.check ?? '').command))].filter(name => name.startsWith('lint:') && !agreedLintTasks.has(name) && scripts[name] !== undefined && duplicateOf(name, scripts[name]) === undefined)
}

/**
 * Get the `turbo run` command of a created `lint` script: the agreed lint tasks, then the project's own
 * @param scripts the scripts
 * @returns the command
 * @example lintCommand({}) // 'turbo run lint:install lint:types lint:knip lint:format lint:issues lint:repo'
 */
function lintCommand(scripts: Readonly<Record<string, string>>) {
  return `turbo run ${[...lintTasks, ...customLintTasks(scripts)].join(' ')}`
}

/**
 * Get the command to write when a task is missing
 * @param context the project context
 * @param task the task name
 * @returns the command, undefined when it cannot be known or its tool is not installed
 */
export async function missingCommand(context: Readonly<Context>, task: string) {
  if (task === 'lint') return lintCommand((context.pkg as PackageJson).scripts as Record<string, string>)
  const needsVitest = task.startsWith('test') && task !== 'test:e2e'
  if (needsVitest && !hasDependency(context.pkg, 'vitest')) return undefined
  const [command] = await taskCommands(context, task)
  return command
}

/** What the Vite tasks run, shown as an example only, the fix does not write them */
const viteExamples: Readonly<Record<string, string>> = { build: 'turbo run build:vite', dev: 'vite', preview: 'vite preview' }

/**
 * Get the script to show as an example when a task is missing, even when the fix cannot write it
 * @param context the project context
 * @param task the task name
 * @returns the whole script, with its echo
 * @example await exampleScript(context, 'lint:knip') // 'knip && echo lint:knip completed successfully'
 */
export async function exampleScript(context: Readonly<Context>, task: string) {
  const [command] = await taskCommands(context, task)
  const example = task === 'lint' ? lintCommand((context.pkg as PackageJson).scripts as Record<string, string>) : (viteExamples[task] ?? command ?? 'tsc -p tsconfig.json')
  return taskScript(task, example)
}
