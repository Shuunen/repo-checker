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
    if (this.data.use_vue) return this.shouldContains('vue typescript rules extend', /@vue\/typescript\/recommended/)
    return this.shouldContains('typescript eslint extend', /plugin:@typescript-eslint\/recommended/)
  }

  async checkVue (): Promise<void> {
    this.shouldContains('vue recommended rules', /plugin:vue\/recommended/)
    this.shouldContains('no easy vue essential rules set', /plugin:vue\/essential/, 0)
    const haveIt = this.couldContains('vue standard rules', /@vue\/standard/)
    if (!haveIt) log.info('^ this might not be necessary, should check a fresh vue app')
    await this.inspectFile('.eslintrc.rules.js')
    this.shouldContains('\'vue/max-attributes-per-line\': \'off\',')
    this.shouldContains('\'vue/singleline-html-element-content-newline\': \'off\',')
  }
}
