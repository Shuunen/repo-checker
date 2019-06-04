const Test = require('../test')

class CheckConfigs extends Test {
  async init () {
    await this.checkFile('.editorconfig')
    await this.checkFile('.gitignore')
    await this.checkFile('.nvmrc')
    await this.checkFile('.travis.yml')
    await this.checkFile('renovate.json')
  }
}

module.exports = CheckConfigs
