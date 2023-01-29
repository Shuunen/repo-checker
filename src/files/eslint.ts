/* eslint-disable max-classes-per-file */
import { Nb, parseJson } from 'shuutils'
import { repoCheckerPath } from '../constants'
import { FileBase } from '../file'
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

export class EsLintFile extends FileBase {
  private checkExtends (): void {
    const hasHardcore = this.couldContains('hardcore rules extend', /hardcore/u)
    if (!hasHardcore) this.couldContains('eslint recommended rules extend', /"eslint:recommended"/u)
    this.couldContains('unicorn rules extend', /plugin:unicorn\/all/u)
    this.shouldContains('no promise plugin (require eslint 7)', /plugin:promise\/recommended|"promise"/u, Nb.None)
    this.couldContains('no plugin section since plugin are included by extends', /"plugins":/u, Nb.None)
  }

  private findRules (config: EslintRcJsonFile): EslintConfigRules {
    const override = config.overrides.find(anOverride => anOverride.files.find(file => file.endsWith('.ts')))
    /* c8 ignore next 4 */
    if (override && Object.keys(override.rules).length > Nb.Zero) {
      log.debug(`found ${Object.keys(override.rules).length} override rules`)
      return override.rules
    }
    if (Object.keys(config.rules).length > Nb.Zero) {
      log.debug(`found no override rules but ${Object.keys(config.rules).length} root/global rules`)
      return config.rules
    }
    log.error('failed to find rules in eslint config')
    return emptyRules
  }

  private checkJs (): boolean {
    return this.shouldContains('eslint recommended rules extend', /eslint:recommended/u)
  }

  private checkTsVue (): boolean {
    this.shouldContains('hardcore typescript rules extend', /hardcore\/ts/u)
    this.shouldContains('hardcore vue rules extend', /hardcore\/vue/u)
    return true
  }

  private checkTs (): boolean {
    // check here ts & vue ts projects
    if (this.data.isUsingVue) return this.checkTsVue()
    // check here ts only projects
    this.shouldContains('hardcore typescript rules extend', /hardcore\/ts/u)
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
  }

  private getMissingRules (expectedRules: EslintConfigRules, rules: EslintConfigRules): string[] {
    return Object.keys(expectedRules).filter(rule => {
      if (specificRepoCheckerRules.has(rule)) return false
      if (rule.startsWith('@typescript') && !this.data.isUsingTypescript) return false
      return !(rule in rules)
    })
  }

  public async start (): Promise<boolean> {
    await this.checkNoFileExists('xo.config.js')
    return await this.checkEslint()
  }

  private async checkEslint (): Promise<boolean> {
    const filename = '.eslintrc.json'
    const hasFile = await this.fileExists(filename)
    if (!hasFile) return log.debug('skipping eslintrc checks')
    await this.inspectFile(filename)
    this.checkExtends()
    await this.checkRules()
    if (this.data.isUsingTailwind) this.shouldContains('tailwind rules extend', /plugin:tailwindcss\/recommended/u)
    if (this.data.isUsingVue) this.checkVue()
    if (this.data.isUsingTypescript) return this.checkTs()
    return this.checkJs()
  }

  // eslint-disable-next-line max-statements
  private async checkRules (): Promise<boolean> {
    let data = parseJson<EslintRcJsonFile>(this.fileContent)
    if (data.error) return log.warn('cannot check empty or invalid .eslintrc.json file')
    const content = new EslintRcJsonFile(data.value)
    const rules = this.findRules(content)
    const expectedJsonString = await readFileInFolder(repoCheckerPath, '.eslintrc.json')
    data = parseJson<EslintRcJsonFile>(expectedJsonString)
    const expectedContent = new EslintRcJsonFile(data.value)
    /* c8 ignore next */
    const expectedRules = this.findRules(expectedContent)
    const missingRules = this.getMissingRules(expectedRules, rules)
    const total = Object.keys(expectedRules).length
    const isOk = this.test(missingRules.length === Nb.Zero, `current .eslintrc.json has only ${total - missingRules.length} of the ${total} custom rules in repo-checker .eslintrc.json`, true)
    if (!isOk) log.warn('missing rules :', missingRules.map(rule => `"${rule}": ${JSON.stringify(expectedRules[rule])}`).join(', '))
    return true
  }
}
