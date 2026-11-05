import { defineRule } from '../../engine/define-rule.ts'
import { requireJsonSchema } from '../../engine/file-rules.ts'
import { hasOwnCompilerOptions, hasTsconfig, readCheckedTsconfig, recommendedCompilerOptions, strictestCompilerOptions } from './tsconfig.utils.ts'

const file = 'tsconfig.json'

export const tsconfigSchema = requireJsonSchema({ files: [file], id: 'tsconfig-schema', schema: 'https://json.schemastore.org/tsconfig', severity: 'warning', when: ({ flags }) => flags.isUsingTypescript === true })

export const tsconfigInclude = defineRule({
  appliesTo: hasOwnCompilerOptions,
  async check(context) {
    const config = await readCheckedTsconfig(context)
    if (config.include === undefined) context.report({ fix: fixer => fixer.json(file).set(['include'], ['src']), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'tsconfig-include', messages: { missing: 'tsconfig.json has no "include" section, like "include": ["src"]' }, severity: 'warning' },
})

export const tsconfigCompilerOptions = defineRule({
  appliesTo: hasOwnCompilerOptions,
  async check(context) {
    const config = await readCheckedTsconfig(context)
    const isStrictest = [config.extends ?? []].flat().some(base => base.includes('tsconfig/strictest'))
    const options = config.compilerOptions ?? {}
    const wrong = Object.entries(isStrictest ? strictestCompilerOptions : recommendedCompilerOptions).filter(([option, value]) => options[option] !== value)
    for (const [option, value] of wrong) context.report({ data: { option, value: String(value) }, fix: fixer => fixer.json(file).set(['compilerOptions', option], value), messageId: 'wrong' })
  },
  meta: { fixable: true, id: 'tsconfig-compiler-options', messages: { wrong: 'tsconfig.json should set "{{option}}": {{value}}' }, severity: 'warning' },
})

/**
 * A rule that requires a compiler option, fixable with a default value
 * @param options the options
 * @param options.id the check id
 * @param options.isSet tell if the current value is fine
 * @param options.option the compiler option name
 * @param options.value the value set by the fix
 * @returns the rule
 */
function requireCompilerOption({ id, isSet, option, value }: Readonly<{ id: string; isSet: (current: unknown) => boolean; option: string; value: unknown }>) {
  return defineRule({
    appliesTo: hasOwnCompilerOptions,
    async check(context) {
      const config = await readCheckedTsconfig(context)
      if (!isSet(config.compilerOptions?.[option])) context.report({ data: { option, value: JSON.stringify(value) }, fix: fixer => fixer.json(file).set(['compilerOptions', option], value), messageId: 'missing' })
    },
    meta: { fixable: true, id, messages: { missing: 'tsconfig.json has no "{{option}}" compiler option, like "{{option}}": {{value}}' }, severity: 'warning' },
  })
}

export const compilerOptionRules = [
  requireCompilerOption({ id: 'tsconfig-out-dir', isSet: current => typeof current === 'string', option: 'outDir', value: './dist' }),
  requireCompilerOption({ id: 'tsconfig-module-resolution', isSet: current => typeof current === 'string', option: 'moduleResolution', value: 'bundler' }),
  requireCompilerOption({ id: 'tsconfig-lib', isSet: current => Array.isArray(current) && current.length > 0, option: 'lib', value: ['ESNext'] }),
]

export const tsconfigNoWildcardFiles = defineRule({
  appliesTo: hasTsconfig,
  async check(context) {
    const config = await readCheckedTsconfig(context)
    for (const entry of (config.files ?? []).filter(item => item.includes('*'))) context.report({ data: { entry }, messageId: 'found' })
  },
  meta: { id: 'tsconfig-no-wildcard-files', messages: { found: 'tsconfig.json has the wildcard "{{entry}}" in its "files" section, use "include" for patterns' }, severity: 'error' },
})

export const tsconfigNoUselessGlob = defineRule({
  appliesTo: hasTsconfig,
  async check(context) {
    const config = await readCheckedTsconfig(context)
    const include = config.include ?? []
    for (const entry of include.filter(item => item.endsWith('/**/*'))) context.report({ data: { entry, folder: entry.replace('/**/*', '') }, fix: fixer => fixer.json(file).update(['include'], current => (current as string[]).map(item => item.replace(/\/\*\*\/\*$/u, ''))), messageId: 'found' })
  },
  meta: { fixable: true, id: 'tsconfig-no-useless-glob', messages: { found: 'tsconfig.json includes "{{entry}}", "{{folder}}" is enough' }, severity: 'warning' },
})
