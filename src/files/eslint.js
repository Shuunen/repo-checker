import { File } from '../file'
import { log } from '../logger'

export class EsLintFile extends File {
  async start () {
    const exists = await this.checkFileExists('.eslintrc.js', true)
    if (!exists) return log.debug('skipping eslintrc checks')
    await this.inspectFile('.eslintrc.js')
    this.shouldContains('external rules', /\.eslintrc\.rules/)
    this.shouldContains('eslint recommended rules', /eslint:recommended/)
    this.shouldContains('standard rules', /standard/)
    await this.checkTs()
    await this.checkVue()
  }

  async checkTs () {
    if (!this.data.use_typescript) return
    this.shouldContains(this.data.use_vue ? '@vue/typescript/recommended' : 'typescript/recommended')
  }

  async checkVue () {
    if (!this.data.use_vue) return
    this.shouldContains('vue recommended rules', /plugin:vue\/recommended/)
    this.shouldContains('no easy vue essential rules set', /plugin:vue\/essential/, 0)
    this.shouldContains('vue standard rules', /@vue\/standard/)
    await this.inspectFile('.eslintrc.rules.js')
    this.shouldContains("'vue/max-attributes-per-line': 'off',")
    this.shouldContains("'vue/singleline-html-element-content-newline': 'off',")
  }
}
