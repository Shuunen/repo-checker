import { Nb, parseJson } from 'shuutils'
import { repoCheckerPath } from '../constants'
import { File } from '../file'
import { log } from '../logger'
import { readFileInFolder } from '../utils'

type EslintConfigRules = Record<string, string[] | string>

interface EslintConfigOverride {
  files: string[]
  extends: string[]
  rules: EslintConfigRules
}

class EslintRcJsonFile {
  public overrides: EslintConfigOverride[] = []

  public rules: EslintConfigRules = {}

  public constructor (data: Partial<EslintRcJsonFile> = {}) {
    Object.assign(this, data)
  }
}

const specificRepoCheckerRules = new Set(['no-restricted-imports'])
const emptyRules: EslintConfigRules = {}

export class EsLintFile extends File {
  public async start (): Promise<boolean> {
    await this.checkNoFileExists('xo.config.js')
    return this.checkEslint()
  }

  private async checkEslint (): Promise<boolean> {
    const filename = '.eslintrc.json'
    const exists = await this.fileExists(filename)
    if (!exists) return log.debug('skipping eslintrc checks')
    await this.inspectFile(filename)
    const hasHardcore = this.couldContains('hardcore rules extend', /hardcore/)
    if (!hasHardcore) this.couldContains('eslint recommended rules extend', /"eslint:recommended"/)
    this.couldContains('unicorn rules extend', /plugin:unicorn\/all/)
    this.shouldContains('no promise plugin (require eslint 7)', /(plugin:promise\/recommended)|("promise")/, Nb.None)
    this.couldContains('no plugin section since plugin are included by extends', /"plugins":/, Nb.None)
    await this.checkRules()
    if (this.data.useTailwind) this.shouldContains('tailwind rules extend', /plugin:tailwindcss\/recommended/)
    if (this.data.useVue) this.checkVue()
    if (this.data.useTypescript) return this.checkTs()
    return this.checkJs()
  }

  private findRules (config: EslintRcJsonFile): EslintConfigRules | undefined {
    const override = config.overrides.find(anOverride => anOverride.files.find(file => file.endsWith('.ts')))
    if (override && Object.keys(override.rules).length > Nb.Zero) {
      log.debug(`found ${Object.keys(override.rules).length} override rules`)
      return override.rules
    }
    if (Object.keys(config.rules).length > Nb.Zero) {
      log.debug(`found no override rules but ${Object.keys(config.rules).length} root/global rules`)
      return config.rules
    }
    log.error('failed to find rules in eslint config')
    return
  }

  private async checkRules (): Promise<boolean> {
    let data = parseJson<EslintRcJsonFile>(this.fileContent)
    if (data.error) return log.warn('cannot check empty or invalid .eslintrc.json file')
    const content = new EslintRcJsonFile(data.value)
    const rules = this.findRules(content)
    /* c8 ignore next */
    if (!rules) return log.error('failed to found project eslint rules')
    const expectedJsonString = await readFileInFolder(repoCheckerPath, '.eslintrc.json')
    data = parseJson<EslintRcJsonFile>(expectedJsonString)
    const expectedContent = new EslintRcJsonFile(data.value)
    /* c8 ignore next */
    const expectedRules = this.findRules(expectedContent) ?? emptyRules
    const missingRules = Object.keys(expectedRules).filter(rule => {
      if (specificRepoCheckerRules.has(rule)) return false
      if (rule.startsWith('@typescript') && !this.data.useTypescript) return false
      return !(rule in rules)
    })
    const total = Object.keys(expectedRules).length
    const ok = this.test(missingRules.length === Nb.Zero, `current .eslintrc.json has only ${total - missingRules.length} of the ${total} custom rules in repo-checker .eslintrc.json`, true)
    if (!ok) log.warn('missing rules :', missingRules.map(rule => `"${rule}": ${JSON.stringify(expectedRules[rule])}`).join(', '))
    return true
  }

  private checkJs (): boolean {
    return this.shouldContains('eslint recommended rules extend', /eslint:recommended/)
  }

  private checkTsVue (): boolean {
    this.shouldContains('hardcore typescript rules extend', /hardcore\/ts/)
    this.shouldContains('hardcore vue rules extend', /hardcore\/vue/)
    return true
  }

  private checkTs (): boolean {
    // check here ts & vue ts projects
    if (this.data.useVue) return this.checkTsVue()
    // check here ts only projects
    this.shouldContains('hardcore typescript rules extend', /hardcore\/ts/)
    return true
  }

  private checkVue (): void {
    this.couldContains('"vue/first-attribute-linebreak": "off"')
    this.couldContains('"vue/html-closing-bracket-newline": "off"')
    this.couldContains('"vue/html-indent": "off"')
    this.couldContains('"vue/html-self-closing": "off"')
    this.couldContains('"vue/max-attributes-per-line": "off"')
    this.couldContains('"vue/no-multiple-template-root": "off"')
    this.couldContains('"vue/singleline-html-element-content-newline": "off"')
    // this.shouldContains('"parser": "vue-eslint-parser"')
    // this.shouldContains('@typescript-eslint/parser inside parserOptions', /"parser": "@typescript-eslint\/parser"/)
    // this.shouldContains('sourceType: module inside parserOptions', /"sourceType": "module"/)
  }
}
