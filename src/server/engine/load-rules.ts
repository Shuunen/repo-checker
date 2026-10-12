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
