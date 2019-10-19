const Test = require('../test')

class CheckConfigs extends Test {
  async start () {
    await this.checkFileExists('.gitignore')
    await this.checkFileExists('.nvmrc')
  }
}

module.exports = CheckConfigs
