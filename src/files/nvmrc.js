const Test = require('../test')

class CheckNvmRc extends Test {
  async start () {
    await this.checkFileExists('.nvmrc')
    await this.inspectFile('.nvmrc')
    const ok = this.couldContains('a recent lts node version', /12\.\d+\.\d+/)
    if (!ok) this.shouldContains('at least last lts node version', /10\.\d+\.\d+/)
  }
}

module.exports = CheckNvmRc
