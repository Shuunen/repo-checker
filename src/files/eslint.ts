import { File } from '../file'
import { log } from '../logger'

export class EsLintFile extends File {
  async start (): Promise<boolean> {
    await this.checkNoFileExists('xo.config.js')
    return this.checkEslint()
  }

  async checkEslint (): Promise<boolean> {
    if (this.data.use_stack) return this.checkEslintStack()
    log.debug('does not use shuunen-stack apparently')
    const filename = this.data.is_module ? '.eslintrc.cjs' : '.eslintrc.js'
    const exists = await this.fileExists(filename)
    if (!exists) return log.debug('skipping eslintrc checks')
    await this.inspectFile(filename)
    this.shouldContains('external rules', /\.eslintrc\.rules/)
    this.shouldContains('standard rules extend', /standard/)
    this.couldContains('unicorn rules extend', /plugin:unicorn\/recommended/)
    await this.checkTs()
    await this.checkVue()
    return true
  }

  async checkEslintStack (): Promise<boolean> {
    log.debug('use shuunen-stack apparently')
    const filename = '.eslintrc.json'
    const exists = await this.checkFileExists(filename)
    if (!exists) return log.debug('skipping eslintrc checks')
    await this.inspectFile(filename)
    if (this.data.package_name !== 'shuunen-stack') this.shouldContains('shuunen-stack rules extends', /extends": "\.\/node_modules\/shuunen-stack/, 1)
    return true
  }

  async checkTs (): Promise<boolean> {
    if (!this.data.use_typescript) return this.shouldContains('eslint recommended rules extend', /eslint:recommended/)
    if (this.data.use_vue) return this.shouldContains('vue typescript rules extend', /@vue\/typescript\/recommended/)
    return this.shouldContains('standard-with-typescript extend', /standard-with-typescript/)
  }

  async checkVue (): Promise<void> {
    if (!this.data.use_vue) return
    this.shouldContains('vue recommended rules', /plugin:vue\/recommended/)
    this.shouldContains('no easy vue essential rules set', /plugin:vue\/essential/, 0)
    const haveIt = this.couldContains('vue standard rules', /@vue\/standard/)
    if (!haveIt) log.info('^ this might not be necessary, should check a fresh vue app')
    await this.inspectFile('.eslintrc.rules.js')
    this.shouldContains('\'vue/max-attributes-per-line\': \'off\',')
    this.shouldContains('\'vue/singleline-html-element-content-newline\': \'off\',')
  }
}
