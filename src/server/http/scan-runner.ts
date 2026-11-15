import type { AnyRule } from '../engine/define-project-rule.ts'
import type { RuleSet } from '../engine/load-rules.ts'
import type { GhRunner } from '../inventory/github.ts'
import { createIgnoredRules, ignoredRulesFile } from '../inventory/ignored-rules.ts'
import { createProjectMemory, type ProjectMemory } from '../inventory/project-memory.ts'
import { scan } from '../inventory/scan.ts'
import type { ScanRunner } from './app.ts'

/**
 * Make the scan the page can ask for: a scan that changes the nitpick mode checks every project again, because the remembered results were checked in the other mode
 * @param context what the scan needs
 * @param context.fetch false with `--no-fetch`
 * @param context.gh runs gh
 * @param context.memory remembers the results
 * @param context.owner the owner given with `--owner`
 * @param context.ruleSet the rules, whose nitpick mode follows the scans
 * @param context.rules the rules of both flavors
 * @param context.target the folder to scan
 * @returns the scan runner
 */
export function scanRunner({ fetch, gh, memory, owner, ruleSet, rules, target }: Readonly<{ fetch: boolean | undefined; gh: GhRunner; memory: ProjectMemory; owner: string | undefined; ruleSet: RuleSet; rules: readonly AnyRule[]; target: string }>): ScanRunner {
  return ({ isNitpick, shouldFetch, shouldReuse }, hooks) => {
    const wanted = isNitpick ?? ruleSet.isNitpick
    const isChanged = wanted !== ruleSet.isNitpick
    ruleSet.isNitpick = wanted
    return scan({ gh, isNitpick: wanted, memory, owner, rules, shouldFetch: fetch !== false && shouldFetch, shouldReuse: shouldReuse && !isChanged, target }, hooks)
  }
}

/**
 * Open what the server keeps between requests: the results of the projects in memory, and the rules the user ignored, read from the disk
 * @param ignoredFile where the ignored rules are saved, the state folder of the user when omitted
 * @returns the memory and the ignored rules
 * @example const { ignored, memory } = await openState()
 */
export async function openState(ignoredFile = ignoredRulesFile()) {
  return { ignored: await createIgnoredRules(ignoredFile), memory: createProjectMemory() }
}
