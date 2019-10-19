const Test = require('../test')

class CheckConfigs extends Test {
  async start () {
    await this.checkFileExists('.gitignore')
    await this.checkFileExists('.nvmrc')
    await this.checkFileExists('.eslintrc.rules.js', true)
  }
}

module.exports = CheckConfigs
