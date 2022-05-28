import { isJSON } from 'shuutils'
import { repoCheckerPath } from '../constants'
import { File } from '../file'
import { log } from '../logger'
import { readFileInFolder } from '../utils'

class EslintRcJsonFile {
  rules: Record<string, string | string[]> = {}
  constructor (data: Partial<EslintRcJsonFile> = {}) {
    Object.assign(this, data)
  }
}

export class EsLintFile extends File {
  async start (): Promise<boolean> {
    await this.checkNoFileExists('xo.config.js')
    return this.checkEslint()
  }

  async checkEslint (): Promise<boolean> {
    const filename = '.eslintrc.json'
    const exists = await this.fileExists(filename)
    if (!exists) return log.debug('skipping eslintrc checks')
    await this.inspectFile(filename)
    this.couldContains('eslint recommended rules extend', /"eslint:recommended"/)
    this.couldContains('unicorn rules extend', /plugin:unicorn\/recommended/)
    this.couldContains('unicorn plugin', /"unicorn"/)
    this.shouldContains('no promise plugin (require eslint 7)', /(plugin:promise\/recommended)|("promise")/, 0)
    await this.checkRules()
    if (this.data.use_vue) await this.checkVue()
    if (this.data.use_typescript) return this.checkTs()
    return this.checkJs()
  }

  async checkRules (): Promise<boolean> {
    const json = isJSON(this.fileContent)
    if (typeof json === 'boolean') return log.warn('cannot check empty or invalid .eslintrc.json file')
    const rules = new EslintRcJsonFile(json).rules
    const expectedJsonString = await readFileInFolder(repoCheckerPath, '.eslintrc.json')
    const expectedJson = isJSON(expectedJsonString)
    /* c8 ignore next */
    if (typeof expectedJson === 'boolean') return log.warn('cannot check empty or invalid repo-checker .eslintrc.json file')
    const expectedRules = new EslintRcJsonFile(expectedJson).rules
    const missingRules = Object.keys(expectedRules).filter(rule => {
      if (rule.startsWith('@typescript') && !this.data.use_typescript) return false
      return !(rule in rules)
    })
    const total = Object.keys(expectedRules).length
    const ok = this.test(missingRules.length === 0, `current .eslintrc.json has only ${total - missingRules.length} of the ${total} custom rules in repo-checker .eslintrc.json`, true)
    if (!ok) log.warn('missing rules :', missingRules.map(rule => `"${rule}": ${JSON.stringify(expectedRules[rule])}`).join(', '))
    return true
  }

  async checkJs (): Promise<boolean> {
    return this.shouldContains('eslint recommended rules extend', /eslint:recommended/)
  }

  async checkTs (): Promise<boolean> {
    // check here ts & vue ts projects
    if (this.data.use_vue) return true
    // check here ts only projects
    this.shouldContains('typescript eslint extend', /plugin:@typescript-eslint\/recommended/)
    this.shouldContains('typescript eslint plugin', /"@typescript-eslint"/)
    return true
  }

  async checkVue (): Promise<void> {
    this.shouldContains('vue recommended rules extends', /plugin:vue\/vue3-recommended/)
    this.shouldContains('no easy vue essential rules set', /plugin:vue\/essential/, 0)
    this.shouldContains('vue ts recommended rules extends', /@vue\/typescript\/recommended/)
    this.couldContains('"vue/max-attributes-per-line": "off"')
    this.couldContains('"vue/html-self-closing": "off"')
    this.couldContains('"vue/no-multiple-template-root": "off"')
    this.couldContains('"vue/singleline-html-element-content-newline": "off"')
    // this.shouldContains('"parser": "vue-eslint-parser"')
    // this.shouldContains('@typescript-eslint/parser inside parserOptions', /"parser": "@typescript-eslint\/parser"/)
    // this.shouldContains('sourceType: module inside parserOptions', /"sourceType": "module"/)
  }
}
