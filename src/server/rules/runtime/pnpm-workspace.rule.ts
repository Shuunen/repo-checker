import { defineRule } from '../../engine/define-rule.ts'

/** The legacy list of packages allowed to run their install script */
const legacyBlock = /^onlyBuiltDependencies:[^\S\n]*\n(?<items>(?:[^\S\n]+-[^\n]*\n?|[^\S\n]*#[^\n]*\n?)*)/mu

/**
 * Move the `onlyBuiltDependencies` list of a pnpm-workspace.yaml into `allowBuilds`, the way pnpm 10 and above reads it: `name: true` for each package, the ones `allowBuilds` already has are kept
 * @param text the current text
 * @returns the new text
 * @example migrateOnlyBuilt('onlyBuiltDependencies:\n  - esbuild\n') // 'allowBuilds:\n  esbuild: true\n'
 */
function migrateOnlyBuilt(text: string) {
  const names: string[] = []
  const withoutLegacy = text.replace(legacyBlock, (...args) => {
    const { items } = args.at(-1) as { items: string }
    for (const match of items.matchAll(/^\s+-\s*["']?(?<name>[^"'#\s]+)["']?/gmu)) names.push((match.groups as { name: string }).name)
    return ''
  })
  const missing = names.filter(name => !new RegExp(`^\\s+["']?${name.replaceAll(/[$()*+.?[\\\]^{|}]/gu, String.raw`\$&`)}["']?:`, 'mu').test(withoutLegacy))
  const lines = missing.map(name => `  ${name}: true`).join('\n')
  if (lines === '') return withoutLegacy
  if (/^allowBuilds:/mu.test(withoutLegacy)) return withoutLegacy.replace(/^allowBuilds:.*$/mu, match => `${match}\n${lines}`)
  return `${withoutLegacy.trim() === '' ? '' : `${withoutLegacy.trimEnd()}\n`}allowBuilds:\n${lines}\n`
}

export const pnpmWorkspaceNoLegacyOnlyBuilt = defineRule({
  async appliesTo({ files }) {
    return legacyBlock.test((await files.readText('pnpm-workspace.yaml')) ?? '')
  },
  check({ report }) {
    report({ fix: fixer => fixer.text('pnpm-workspace.yaml', migrateOnlyBuilt), messageId: 'legacy' })
  },
  meta: { fixable: true, id: 'pnpm-workspace-no-legacy-only-built', messages: { legacy: 'pnpm-workspace.yaml uses the legacy "onlyBuiltDependencies" list, use "allowBuilds" with "name: true" per package' }, severity: 'warning' },
})
