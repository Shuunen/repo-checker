const Test = require('../test')

class CheckRenovate extends Test {
  async start () {
    await this.checkFileExists('renovate.json')
    await this.inspectFile('renovate.json')
    this.shouldContains('an extends section', /"extends"/)
    this.shouldContains('a base config', /"config:base"/)
    this.shouldContains('an auto merge config', /":automergeAll"/)
  }
}

module.exports = CheckRenovate
