type EslintConfigRules = Readonly<Record<string, string | readonly string[]>>

type EslintConfigOverride = Readonly<{
  extends: readonly string[]
  files: readonly string[]
  rules: Readonly<EslintConfigRules>
}>

export type EslintRcJsonFile = Readonly<{
  overrides?: readonly EslintConfigOverride[]
  rules?: Readonly<EslintConfigRules>
}>

export const recommendedVueRules = {
  'vue/first-attribute-linebreak': 'off',
  'vue/html-closing-bracket-newline': 'off',
  'vue/html-indent': 'off',
  'vue/html-self-closing': 'off',
  'vue/max-attributes-per-line': 'off',
  'vue/no-multiple-template-root': 'off',
  'vue/singleline-html-element-content-newline': 'off',
}

export const specificRepoCheckerRules = new Set(['no-restricted-imports'])

export type { EslintConfigRules }
