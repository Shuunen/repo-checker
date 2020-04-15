import { Test } from '../test'

export class CheckConfigs extends Test {
  async start () {
    await this.checkFileExists('.gitignore')
    await this.checkFileExists('.eslintrc.rules.js', true)
    await this.checkFileExists('.csscomb.json', true)
  }
}
