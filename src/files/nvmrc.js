const Test = require('../test')

class CheckNvmRc extends Test {
  async start () {
    await this.checkFileExists('.nvmrc')
    await this.inspectFile('.nvmrc')
    if (!this.fileContent.includes('v12.')) {
      const ok = this.shouldContains('at least last lts node version', /10\.\d+\.\d+/)
      if (ok) this.couldContains('a recent lts node version', /v12\.16\.\d+/)
    }
  }
}

module.exports = CheckNvmRc
