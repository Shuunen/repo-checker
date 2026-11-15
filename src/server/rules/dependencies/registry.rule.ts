import { invariant } from 'es-toolkit'
import { plural } from '../../../shared/text.ts'
import type { Context } from '../../engine/context.ts'
import { defineRule } from '../../engine/define-rule.ts'
import type { Advisory, RegistryFacts } from '../../engine/flags.ts'
import { declaredDependencies, updateKind, withVersion } from '../../engine/versions.ts'

/** The longest deprecation notice shown, the registry sometimes explains a lot */
const noticeLength = 120

/** How bad an advisory is, the worst first */
const severityOrder = ['critical', 'high', 'moderate', 'low', 'info']

/**
 * Tell if the registry facts are there to check the dependencies against
 * @param context the project context
 * @param context.flags the project flags
 * @param context.pkg the package.json
 * @returns true when the project has a package.json and the registry could be reached
 */
function hasRegistry({ flags, pkg }: Readonly<Context>) {
  return pkg !== undefined && flags.registry !== undefined
}

/**
 * Read the registry facts in a rule whose appliesTo guarantees them
 * @param context the project context
 * @param context.flags the project flags
 * @returns the facts
 */
function registryOf({ flags }: Readonly<Context>): RegistryFacts {
  invariant(flags.registry !== undefined, 'appliesTo guarantees the registry facts')
  return flags.registry
}

/**
 * Find the dependencies behind the registry by a kind of update
 * @param context the project context, with the registry facts
 * @param major true to find the major updates, false for the minor and patch ones
 * @yields {{ data: Record<string, string>, latest: string, name: string, section: string }} each outdated dependency
 */
function* outdated(context: Readonly<Context>, major: boolean) {
  const { packages } = registryOf(context)
  for (const { name, prefix, section, version } of declaredDependencies(context.pkg)) {
    const latest = packages[name]?.latest
    const kind = latest === undefined ? undefined : updateKind(version, latest, prefix)
    if (latest !== undefined && kind !== undefined && (kind === 'major') === major) yield { data: { kind, latest, mine: `${prefix}${version}`, name }, latest, name, section }
  }
}

export const outdatedMajorDependency = defineRule({
  appliesTo: hasRegistry,
  check(context) {
    // a major update can break the code, it is left to you and to Renovate
    for (const { data } of outdated(context, true)) context.report({ data, messageId: 'behind' })
  },
  meta: { id: 'outdated-major-dependency', messages: { behind: '{{name}} {{mine}} is behind the latest {{latest}}, a major update' }, severity: 'warning' },
})

export const outdatedMinorDependency = defineRule({
  appliesTo: hasRegistry,
  check(context) {
    for (const { data, latest, name, section } of outdated(context, false)) context.report({ data, fix: fixer => fixer.json('package.json').update([section, name], current => withVersion(String(current), latest)), messageId: 'behind' })
  },
  meta: { fixable: true, id: 'outdated-minor-dependency', messages: { behind: '{{name}} {{mine}} is behind the latest {{latest}}, a {{kind}} update' }, nitpick: true, severity: 'info' },
})

export const deprecatedDependency = defineRule({
  appliesTo: hasRegistry,
  check(context) {
    const { packages } = registryOf(context)
    for (const { name } of declaredDependencies(context.pkg)) {
      const notice = packages[name]?.deprecated
      if (notice !== undefined) context.report({ data: { name, notice: notice.slice(0, noticeLength) }, messageId: 'deprecated' })
    }
  },
  meta: { id: 'deprecated-dependency', messages: { deprecated: '{{name}} is deprecated: {{notice}}' }, severity: 'warning' },
})

/**
 * Find the worst of some advisories
 * @param advisories the advisories, at least one
 * @returns the worst
 */
function worstOf(advisories: readonly Advisory[]) {
  const ranked = advisories.toSorted((first, second) => severityOrder.indexOf(first.severity) - severityOrder.indexOf(second.severity))
  const [worst] = ranked
  invariant(worst !== undefined, 'a package with advisories has one')
  return worst
}

export const securityAdvisory = defineRule({
  appliesTo: context => hasRegistry(context) && registryOf(context).advisories !== undefined,
  check(context) {
    const { advisories = {} } = registryOf(context)
    for (const { name, version } of declaredDependencies(context.pkg)) {
      const found = advisories[`${name}@${version}`] ?? []
      if (found.length === 0) continue
      const worst = worstOf(found)
      context.report({ data: { count: plural(found.length, 'advisory'), name, severity: worst.severity, title: worst.title, url: worst.url, version }, messageId: 'found' })
    }
  },
  meta: { id: 'security-advisory', messages: { found: '{{name}}@{{version}} has {{count}}, the worst is {{severity}}: {{title}} ({{url}}), update it' }, severity: 'error' },
})
