import { clone, parseJson } from 'shuutils'
import { repoCheckerPath } from '../constants'
import { FileBase } from '../file'
import { log } from '../logger'
import { objectToJson, readFileInFolder } from '../utils'
import { recommendedVueRules, specificRepoCheckerRules, type EslintConfigRules, type EslintRcJsonFile } from './eslint.model'

export class EsLintFile extends FileBase {

  private checkExtends () {
    const hasHardcore = this.couldContains('hardcore rules extend', /hardcore/u)
    if (!hasHardcore) this.couldContains('eslint recommended rules extend', /"eslint:recommended"/u)
    this.couldContains('unicorn rules extend', /plugin:unicorn\/all/u)
    this.shouldContains('no promise plugin (require eslint 7)', /plugin:promise\/recommended|"promise"/u, 0)
  }

  private findRules (config: EslintRcJsonFile) {
    if (config.rules && Object.keys(config.rules).length > 0) {
      log.debug(`found ${Object.keys(config.rules).length} root/global rules`)
      return config.rules
    }
    const override = config.overrides?.find(anOverride => anOverride.files.find(file => file.endsWith('.ts')))
    if (override && Object.keys(override.rules).length > 0) {
      log.debug(`found ${Object.keys(override.rules).length} override rules`)
      return override.rules
    }
    log.error('failed to find rules in eslint config')
    return {} as EslintConfigRules // eslint-disable-line @typescript-eslint/consistent-type-assertions
  }

  private injectRules (input: EslintRcJsonFile, rules: EslintConfigRules) {
    const output = clone(input)
    if (output.rules && Object.keys(output.rules).length > 0) {
      Object.assign(output.rules, rules)
      return output
    }
    const override = output.overrides?.find(anOverride => anOverride.files.find(file => file.endsWith('.ts')))
    if (override && Object.keys(override.rules).length > 0) {
      Object.assign(override.rules, rules)
      return output
    }
    log.error('failed to inject rules in eslint config')
    return output
  }

  private checkTsVue () {
    this.shouldContains('hardcore vue rules extend', /hardcore\/vue/u)
  }

  private checkTs () {
    // check here ts & vue ts projects
    this.couldContains('hardcore typescript rules extend', /hardcore\/ts/u)
    this.couldContains('a disabled explicit function return type', /"@typescript-eslint\/explicit-function-return-type": "error"/u, 0)
    // eslint-disable-next-line sonarjs/no-redundant-jump, no-useless-return
    if (this.data.isUsingVue) { this.checkTsVue(); return }
    // check here ts only projects
  }

  private getMissingRulesFrom (expectedRules: EslintConfigRules, rules: EslintConfigRules) {
    return Object.keys(expectedRules).filter(rule => {
      /* c8 ignore next */
      if (specificRepoCheckerRules.has(rule)) return false
      if (rule.startsWith('@typescript') && !this.data.isUsingTypescript) return false
      return !(rule in rules)
    })
  }

  private updateFileContent (input: EslintRcJsonFile, expectedRules: EslintConfigRules) {
    const fixedContent = this.injectRules(input, expectedRules)
    /* c8 ignore next */
    if (fixedContent.overrides?.length === 0) delete fixedContent.overrides
    this.fileContent = objectToJson(fixedContent)
  }

  private reportMissingRules (expectedRules: EslintConfigRules, missingRules: readonly string[]) {
    const total = Object.keys(expectedRules).length
    const isOk = this.test(missingRules.length === 0, `current .eslintrc.json has only ${total - missingRules.length} of the ${total} custom rules in repo-checker .eslintrc.json`, true)
    if (!isOk) log.warn('missing rules :', missingRules.map(rule => `"${rule}": ${JSON.stringify(expectedRules[rule])}`).join(', '))
  }

  private async getExpectedRules () {
    const expectedJsonString = await readFileInFolder(repoCheckerPath, '.eslintrc.json')
    const data = parseJson<EslintRcJsonFile>(expectedJsonString)
    let expectedContent = clone(data.value)
    if (this.data.isUsingVue) expectedContent = this.injectRules(expectedContent, recommendedVueRules)
    const expectedRules = this.findRules(expectedContent)
    log.debug('found', Object.keys(expectedRules).length, 'expected rules')
    return expectedRules
  }

  private async getRules (input: object) {
    const content = clone(input)
    const rules = this.findRules(content)
    const expectedRules = await this.getExpectedRules()
    const missingRules = this.getMissingRulesFrom(expectedRules, rules)
    log.debug('found', missingRules.length, 'missing rules')
    return { expectedRules, missingRules }
  }

  public async start () {
    await this.checkNoFileExists('xo.config.js')
    await this.checkEslint()
  }

  private async checkEslint () {
    const filename = '.eslintrc.json'
    const hasFile = await this.fileExists(filename)
    if (!hasFile) { log.debug('skipping eslintrc checks'); return }
    await this.inspectFile(filename)
    this.checkExtends()
    await this.checkRules()
    if (this.data.isUsingTailwind) this.shouldContains('tailwind rules extend', /plugin:tailwindcss\/recommended/u)
    if (this.data.isUsingTypescript) this.checkTs()
  }

  private async checkRules () {
    const data = parseJson<EslintRcJsonFile>(this.fileContent)
    if (data.error) { log.warn('cannot check empty or invalid .eslintrc.json file'); return }
    const { expectedRules, missingRules } = await this.getRules(data.value)
    if (missingRules.length === 0) return
    if (this.canFix) { this.updateFileContent(data.value, expectedRules); return }
    this.reportMissingRules(expectedRules, missingRules)
  }
}
