const Test = require('../test')

class CheckConfigs extends Test {
  async start () {
    await this.checkFile('.editorconfig')
    await this.checkFile('.gitignore')
    await this.checkFile('.nvmrc')
    await this.checkFile('renovate.json')
  }
}

module.exports = CheckConfigs
