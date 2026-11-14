/**
 * The agreed turbo.json, see docs/scripts-turbo.md: the schema, the global dependencies, and for each task its inputs and outputs.
 * @module
 */
import { parse } from 'jsonc-parser'
import type { FileReader } from '../../engine/io.ts'
import type { PackageJson } from '../../engine/package-json.ts'
import { parseTask } from '../scripts/tasks.utils.ts'

/** What a task of turbo.json declares */
export interface TurboTask {
  /** The tasks that run before */
  dependsOn?: string[]
  /** The files that change the result, the cache key */
  inputs?: string[]
  /** The files the task produces, restored from the cache */
  outputs?: string[]
}

/** The parts of turbo.json the rules read */
interface TurboJson {
  /** The json schema url */
  $schema?: string
  /** The tasks by name */
  tasks?: Record<string, TurboTask>
}

/** The indent of the json written by the fixes */
const jsonIndent = 2

/** The json schema of turbo.json */
export const turboSchema = 'https://turborepo.dev/schema.json'

/** What is written for the tasks that differ from turbo's defaults, the other tasks need nothing: without `inputs` turbo hashes every tracked file (`$TURBO_DEFAULT$`). `lint:install` only reads the files of the install, `lint:repo` also reads `dist/`, which git ignores */
const knownTasks: Readonly<Record<string, TurboTask>> = {
  build: { outputs: ['dist/**'] },
  'build:tsdown': { outputs: ['dist/**'] },
  'build:vite': { outputs: ['dist/**'] },
  'lint:install': { inputs: ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'] },
  'lint:repo': { inputs: ['$TURBO_DEFAULT$', 'dist/**'] },
  'test:unit': { outputs: ['coverage/**'] },
}

/** The inputs a hand-written list must start from: every file tracked by git and not ignored, what turbo does without `inputs` */
export const defaultInputs = '$TURBO_DEFAULT$'

/** The tasks that must declare their outputs, so a cache hit restores them */
export const outputTasks = ['build:vite', 'test:unit']

/**
 * List the build tasks the `lint:repo` task of a project must depend on: every `build:*` script, because repo-check looks at the build output. The `build` script is left out, it often runs `turbo run` itself
 * @param pkg the package.json
 * @returns the task names
 * @example repoBuildTasks({ scripts: { 'build:tsc': 'tsc -b', 'build:vite': 'vite build', dev: 'vite' } }) // ['build:tsc', 'build:vite']
 */
export function repoBuildTasks(pkg: Readonly<PackageJson> | undefined) {
  return Object.keys(pkg?.scripts ?? {}).filter(name => name.startsWith('build:'))
}

/**
 * Get the declaration of a task, as written by the fixes. Its keys are in alphabetical order, the order the fixes keep a json file in, so the file is not rewritten
 * @param name the task name
 * @param pkg the package.json: every task but `lint:install` depends on it when it has one, and `lint:repo`, or a task whose script reads `dist/`, on the builds it has
 * @returns the task
 * @example defaultTask('lint:types') // { inputs: ['src/**\/*.{ts,tsx}', 'tsconfig*.json'] }
 */
export function defaultTask(name: string, pkg?: Readonly<PackageJson>): TurboTask {
  const task = structuredClone(knownTasks[name] ?? {})
  const install = name !== 'lint:install' && pkg?.scripts?.['lint:install'] !== undefined ? ['lint:install'] : []
  const needsBuild = name === 'lint:repo' || (!name.startsWith('build') && /\bdist\//u.test(pkg?.scripts?.[name] ?? ''))
  const dependsOn = [...install, ...(needsBuild ? repoBuildTasks(pkg) : [])]
  return dependsOn.length > 0 ? { dependsOn, ...task } : task
}

/**
 * List the tasks the scripts `check`, `lint` and `test` run through `turbo run`
 * @param pkg the package.json
 * @returns the task names, sorted
 * @example turboRunTasks({ scripts: { lint: 'turbo run lint:types lint:format' } }) // ['lint:format', 'lint:types']
 */
function turboRunTasks(pkg: Readonly<PackageJson> | undefined) {
  const commands = ['check', 'lint', 'test'].map(name => parseTask(pkg?.scripts?.[name] ?? '').command)
  const tasks = commands.flatMap(command => command.split(' && ')).flatMap(segment => (segment.startsWith('turbo run ') ? segment.slice('turbo run '.length).split(' ') : []))
  return [...new Set(tasks.filter(task => /^[a-z][\w:-]*$/u.test(task)))].toSorted()
}

/**
 * Find a task in turbo.json, named as is or `//#name` for a task of the root package
 * @param tasks the tasks of turbo.json
 * @param name the task name
 * @returns the key and the task, undefined when the task is not declared
 * @example findTask({ '//#lint:types': {} }, 'lint:types') // { key: '//#lint:types', task: {} }
 */
export function findTask(tasks: Readonly<Record<string, TurboTask>> | undefined, name: string) {
  const key = [name, `//#${name}`].find(candidate => tasks?.[candidate] !== undefined)
  return key === undefined ? undefined : { key, task: tasks?.[key] as TurboTask }
}

/**
 * Read turbo.json
 * @param files the project files reader
 * @returns the parsed file, undefined when the project has none
 */
export async function readTurbo(files: FileReader) {
  const text = await files.readText('turbo.json')
  return text === undefined ? undefined : ((parse(text) as TurboJson | undefined) ?? {})
}

/**
 * Put the arrays of strings of a json text on one line, like the formatter does, the json edits expand them
 * @param text the json text
 * @returns the json text, with each array of strings on one line
 * @example collapseArrays('{ "a": [\n  "b",\n  "c"\n] }') // '{ "a": ["b", "c"] }'
 */
export function collapseArrays(text: string) {
  return text.replaceAll(/\[\s*(?<items>"(?:[^"\\]|\\.)*"(?:\s*,\s*"(?:[^"\\]|\\.)*")*)\s*\]/gu, (_match, items: string) => `[${Array.from(items.matchAll(/"(?:[^"\\]|\\.)*"/gu), found => found[0]).join(', ')}]`)
}

/**
 * Build a turbo.json for some tasks
 * @param names the task names
 * @param pkg the package.json
 * @returns the file text
 * @example buildTurboJson(['lint:types'])
 */
export function buildTurboJson(names: readonly string[], pkg?: Readonly<PackageJson>) {
  const tasks = Object.fromEntries(names.map(name => [name, defaultTask(name, pkg)]))
  return collapseArrays(`${JSON.stringify({ $schema: turboSchema, tasks }, undefined, jsonIndent)}\n`)
}

/**
 * List the tasks turbo.json must declare: the ones run by `turbo run`, and the ones they depend on, like `lint:install` and the builds
 * @param pkg the package.json
 * @returns the task names, sorted
 * @example turboTasks({ scripts: { lint: 'turbo run lint:types', 'lint:install': 'pnpm install' } }) // ['lint:install', 'lint:types']
 */
export function turboTasks(pkg: Readonly<PackageJson> | undefined) {
  const run = turboRunTasks(pkg)
  return [...new Set([...run, ...run.flatMap(name => defaultTask(name, pkg).dependsOn ?? [])])].toSorted()
}

/**
 * Get the prefix of the task names: turbo.json of a single package project declares its tasks as `//#name`, root tasks
 * @param tasks the tasks of turbo.json
 * @returns `//#` when the tasks are root tasks, empty otherwise
 * @example rootPrefix({ '//#lint:types': {} }) // '//#'
 */
export function rootPrefix(tasks: Readonly<Record<string, TurboTask>> | undefined) {
  return Object.keys(tasks ?? {}).some(key => key.startsWith('//#')) ? '//#' : ''
}

/**
 * Write the tasks a task depends on with the prefix of the file
 * @param task the task
 * @param prefix the prefix of the task names, see `rootPrefix`
 * @returns the task, its `dependsOn` prefixed
 * @example prefixed({ dependsOn: ['lint:install'] }, '//#') // { dependsOn: ['//#lint:install'] }
 */
export function prefixed(task: Readonly<TurboTask>, prefix: string): TurboTask {
  return task.dependsOn === undefined ? { ...task } : { ...task, dependsOn: task.dependsOn.map(name => `${prefix}${name}`) }
}
