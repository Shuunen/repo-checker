/**
 * Find the rules: every `*.rule.ts` file under a folder, no list to maintain.
 * The server build must keep each rule file as its own module, a bundle would hide them from the loader.
 * @module
 */
import { glob } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { isNil } from 'es-toolkit'
import { type AnyRule, isProjectRule, type ProjectRule } from './define-project-rule.ts'
import type { Rule } from './define-rule.ts'

/** The rule file patterns: sources when running from src, built files when running from dist */
const ruleFiles = ['**/*.rule.ts', '**/*.rule.js']

/**
 * Tell a rule from the other exports of a file, like helpers or constants
 * @param value an exported value
 * @returns true if it is a rule of either flavor, an object with `meta` and `check`
 */
export function isRule(value: unknown): value is AnyRule {
  return typeof value === 'object' && !isNil(value) && 'meta' in value && 'check' in value
}

/**
 * Find every `*.rule.ts` file under a folder and collect the rules they export, alone or in arrays. Other exports are ignored
 * @param folder the absolute path of the rules folder
 * @returns the rules, ordered by file path then export order
 * @example const rules = await loadRules(path.join(import.meta.dirname, 'rules'))
 */
export async function loadRules(folder: string) {
  const files = await Array.fromAsync(glob(ruleFiles, { cwd: folder }))
  const modules = await Promise.all(files.toSorted().map(file => import(pathToFileURL(path.join(folder, file)).href) as Promise<Record<string, unknown>>))
  return modules.flatMap(module =>
    Object.values(module)
      .flat()
      .filter(value => isRule(value)),
  )
}

/**
 * Split rules by flavor: file rules run on usable clones, project rules on every project
 * @param rules the rules of both flavors
 * @returns the file rules and the project rules, each in their original order
 * @example const { fileRules, projectRules } = splitRules(await loadRules(folder))
 */
export function splitRules(rules: readonly AnyRule[]) {
  const projectRules: ProjectRule[] = []
  const fileRules: Rule[] = []
  for (const rule of rules)
    if (isProjectRule(rule)) projectRules.push(rule)
    else fileRules.push(rule)
  return { fileRules, projectRules }
}

/**
 * Keep the rules that run: the nitpick rules only run in nitpick mode
 * @param rules the rules of both flavors
 * @param isNitpick true in nitpick mode
 * @returns the rules to run
 * @example const active = activeRules(rules, process.argv.includes('--nitpick'))
 */
export function activeRules(rules: readonly AnyRule[], isNitpick: boolean) {
  return isNitpick ? rules : rules.filter(rule => rule.meta.nitpick !== true)
}

/** The rules split by flavor, whose lists follow the nitpick mode: the actions of the ui server hold one, so the page can switch the mode without restarting */
export interface RuleSet {
  /** The file rules that run now */
  readonly fileRules: readonly Rule[]
  /** True when the nitpick rules run too, set it to change the mode */
  isNitpick: boolean
  /** The project rules that run now */
  readonly projectRules: readonly ProjectRule[]
}

/**
 * Split rules by flavor, with lists that follow the nitpick mode
 * @param rules the rules of both flavors
 * @param isNitpick true to start with the nitpick rules
 * @returns the rule set
 * @example const set = createRuleSet(rules, false)
 */
export function createRuleSet(rules: readonly AnyRule[], isNitpick: boolean): RuleSet {
  const quiet = splitRules(activeRules(rules, false))
  const all = splitRules(rules)
  const set: RuleSet = {
    get fileRules() {
      return (set.isNitpick ? all : quiet).fileRules
    },
    isNitpick,
    get projectRules() {
      return (set.isNitpick ? all : quiet).projectRules
    },
  }
  return set
}
