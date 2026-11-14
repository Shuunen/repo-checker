import { invariant } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'
import type { PackageJson } from '../../engine/package-json.ts'
import { compareKeys, sortJson } from '../../engine/sort-json.ts'

/** A part of the package.json that is looked at, its name for the message and its content */
type Section = readonly [name: string, value: object | undefined]

/** What a sort check needs */
interface SortedOptions {
  /** The check id */
  id: string
  /** The message, `{{section}}` is the name of the unsorted part */
  message: string
  /** Get the parts of the package.json whose keys must be sorted */
  sections: (pkg: Readonly<PackageJson>) => readonly Section[]
}

/**
 * Tell if keys are in the order `sortJson` gives: `$schema` first, the others alphabetically
 * @param keys the keys
 * @returns true when they are in order
 * @example isInOrder(['a', 'b']) // true
 */
function isInOrder(keys: readonly string[]) {
  return keys.every((key, index) => compareKeys(keys[index - 1] ?? key, key) <= 0)
}

/**
 * A check that parts of the package.json have their keys sorted. The fix sorts the whole file like every fix of a package.json does, the content of `exports`, `imports` and `typesVersions` keeps its order as the conditions are matched in order
 * @param options the check
 * @param options.id the check id
 * @param options.message the message, `{{section}}` is the name of the unsorted part
 * @param options.sections get the parts to look at
 * @returns the rule
 */
function requireSortedKeys({ id, message, sections }: Readonly<SortedOptions>) {
  return defineRule({
    appliesTo: ({ pkg }) => pkg !== undefined,
    check({ pkg, report }) {
      invariant(pkg !== undefined, 'appliesTo guarantees a package.json')
      for (const [name, value] of sections(pkg)) if (value !== undefined && !isInOrder(Object.keys(value))) report({ data: { section: name }, fix: fixer => fixer.text('package.json', text => sortJson('package.json', '', text)), messageId: 'unsorted' })
    },
    meta: { fixable: true, id, messages: { unsorted: message }, severity: 'info' },
  })
}

/** The sections of dependencies a package.json can have */
const dependencySections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'] as const

export const packageKeysSorted = requireSortedKeys({ id: 'package-keys-sorted', message: 'the keys of {{section}} are not sorted alphabetically, with "$schema" first', sections: pkg => [['package.json', pkg]] })
export const packageScriptsSorted = requireSortedKeys({ id: 'package-scripts-sorted', message: 'the {{section}} are not sorted alphabetically', sections: pkg => [['scripts', pkg.scripts]] })
export const packageDependenciesSorted = requireSortedKeys({ id: 'package-dependencies-sorted', message: 'the {{section}} are not sorted alphabetically', sections: pkg => dependencySections.map(name => [name, pkg[name]] as const) })
