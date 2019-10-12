const Test = require('../test')

class CheckConfigs extends Test {
  async start () {
    await this.checkFileExists('.editorconfig')
    await this.checkFileExists('.gitignore')
    await this.checkFileExists('.nvmrc')
    await this.checkFileExists('renovate.json')
  }
}

module.exports = CheckConfigs
