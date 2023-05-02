
export type EslintConfigRules = Record<string, string[] | string>

export class EslintRcJsonFile {
  public overrides?: {
    files: string[]
    extends: string[]
    rules: EslintConfigRules
  }[] = []

  public rules: EslintConfigRules = {}

  public constructor (data: Partial<EslintRcJsonFile> = {}) {
    Object.assign(this, data)
  }
}

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
