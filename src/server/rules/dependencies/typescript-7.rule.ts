import { defineRule } from '../../engine/define-rule.ts'
import type { ProjectFlags } from '../../engine/flags.ts'
import { dependencyVersion, hasDependency } from '../../engine/package-json.ts'
import { parseSpec } from '../../engine/versions.ts'

const preview = '@typescript/native-preview'

/** The first TypeScript major with the native compiler */
const nativeMajor = 7

const sections = ['dependencies', 'devDependencies'] as const

/** The range written when the registry does not tell the latest TypeScript 7 */
const fallbackRange = '~7.0.2'

/**
 * Get the range to write for TypeScript 7: the latest 7 published, with `~`
 * @param flags the project flags
 * @param flags.registry what the npm registry says
 * @returns the range
 * @example typescriptRange({}) // '~7.0.2'
 */
function typescriptRange({ registry }: Readonly<ProjectFlags>) {
  const latest = registry?.packages.typescript?.latest
  return latest?.startsWith('7.') === true ? `~${latest}` : fallbackRange
}

export const typescript7 = defineRule({
  appliesTo: ({ pkg }) => hasDependency(pkg, 'typescript') || hasDependency(pkg, preview),
  check({ flags, pkg, report }) {
    const spec = dependencyVersion(pkg, 'typescript')
    const major = Number(parseSpec(spec ?? '')?.version.split('.')[0] ?? Number.POSITIVE_INFINITY)
    const range = typescriptRange(flags)
    if (major < nativeMajor) report({ data: { spec: String(spec) }, fix: fixer => fixer.json('package.json').update([pkg?.dependencies?.typescript === undefined ? 'devDependencies' : 'dependencies', 'typescript'], () => range), installs: ['typescript'], messageId: 'old' })
    if (hasDependency(pkg, preview))
      report({
        fix: fixer => [...sections.filter(section => pkg?.[section]?.[preview] !== undefined).map(section => fixer.json('package.json').remove([section, preview])), ...(spec === undefined ? [fixer.json('package.json').set(['devDependencies', 'typescript'], range)] : [])],
        installs: spec === undefined ? ['typescript'] : [],
        messageId: 'preview',
      })
  },
  meta: {
    fixable: true,
    id: 'typescript-7',
    messages: {
      old: 'typescript is "{{spec}}", use TypeScript 7 (native tsc), like "typescript": "~7.0"',
      preview: '@typescript/native-preview is installed, TypeScript 7 brings the native tsc, so tsgo is not needed anymore',
    },
    severity: 'warning',
  },
})
