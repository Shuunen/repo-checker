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
  }
}
