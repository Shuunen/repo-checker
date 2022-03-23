import { File } from '../file'
import { log } from '../logger'

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
    this.shouldContains('no promise plugin (require eslint 7)', /(plugin:promise\/recommended)|("promise")/, 0)
    if (this.data.use_vue) await this.checkVue()
    if (this.data.use_typescript) return this.checkTs()
    return this.checkJs()
  }

  async checkJs (): Promise<boolean> {
    return this.shouldContains('eslint recommended rules extend', /eslint:recommended/)
  }

  async checkTs (): Promise<boolean> {
    this.shouldContains('typescript eslint extend', /plugin:@typescript-eslint\/recommended/)
    this.shouldContains('typescript eslint plugin', /"@typescript-eslint"/)
    return true
  }

  async checkVue (): Promise<void> {
    this.shouldContains('vue recommended rules', /plugin:vue\/vue3-recommended/)
    this.shouldContains('no easy vue essential rules set', /plugin:vue\/essential/, 0)
    this.couldContains('"vue/max-attributes-per-line": "off"')
    this.couldContains('"vue/html-self-closing": "off"')
    this.couldContains('"vue/no-multiple-template-root": "off"')
    this.couldContains('"vue/singleline-html-element-content-newline": "off"')
    this.shouldContains('"parser": "vue-eslint-parser"')
    this.shouldContains('@typescript-eslint/parser inside parserOptions', /"parser": "@typescript-eslint\/parser"/)
    this.shouldContains('sourceType: module inside parserOptions', /"sourceType": "module"/)
  }
}
